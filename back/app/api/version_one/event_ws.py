from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from app.core.db import get_session
from app.models import Event, User, EventAttendee, EventMessage, MessageRead
from datetime import datetime, timezone
from app.services.message_sync import MessageVersion, get_synchronizer
from collections import defaultdict

router = APIRouter(prefix="/events/{event_id}/ws", tags=["events"])

typing_status: Dict[int, Dict[int, datetime]] = defaultdict(dict)
user_presence: Dict[int, datetime] = {}
PRESENCE_TIMEOUT_SECONDS = 300  
event_connections: Dict[int, Dict[int, WebSocket]] = {}
_main_event_loop = None

def set_main_event_loop(loop):
    """Set the main event loop reference"""
    global _main_event_loop
    _main_event_loop = loop

@router.websocket("")
async def event_chat_websocket(websocket: WebSocket, event_id: int):
    """WebSocket endpoint for real-time event chat"""
    
    global _main_event_loop
    if _main_event_loop is None:
        import asyncio
        try:
            _main_event_loop = asyncio.get_running_loop()
        except RuntimeError:
            _main_event_loop = asyncio.get_event_loop()
    await websocket.accept()
    
    
    user_id = None
    user_name = None
    user_email = None
    user_photo_url = None
    try:
        token = websocket.query_params.get("token")
        if token:
            from app.core.security import decode_token
            payload = decode_token(token)
            user_id = int(payload.get("sub"))
            
            
            session_gen = get_session()
            try:
                session = next(session_gen)
                try:
                    user = session.get(User, user_id)
                    if user:
                        user_name = user.name or user.email
                        user_email = user.email
                        user_photo_url = user.photo_url
                finally:
                    
                    try:
                        next(session_gen)
                    except StopIteration:
                        pass
            except Exception:
                
                try:
                    session_gen.close()
                except:
                    pass
                raise
    except Exception as e:
        await websocket.close(code=1008, reason="Invalid authentication")
        return
    
    if not user_id:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    
    session_gen = get_session()
    try:
        session = next(session_gen)
        evt = session.get(Event, event_id)
        if not evt:
            await websocket.close(code=1008, reason="Event not found")
            return
        
        
        is_attendee = session.exec(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.user_id == user_id
            )
        ).first()
        is_owner = evt.created_by == user_id
        
        if not is_attendee and not is_owner:
            await websocket.close(code=1008, reason="Access denied")
            return
        
        
        if event_id not in event_connections:
            event_connections[event_id] = {}
        
        
        event_connections[event_id][user_id] = websocket
        
        
        user_presence[user_id] = datetime.now(timezone.utc)
        
        
        synchronizer = get_synchronizer(str(event_id), "event")
        
        
        messages = session.exec(
            select(EventMessage).where(EventMessage.event_id == event_id)
            .order_by(EventMessage.created_at.desc())
            .limit(50)
        ).all()
        
        
        
        sorted_messages = sorted(messages, key=lambda m: m.created_at)
        for msg in sorted_messages:
            created_at = msg.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            
            
            synchronizer.initialize_message_version(
                message_id=msg.id,
                user_id=msg.user_id,
                content=msg.content if not msg.is_deleted else "",
                created_at=created_at
            )
        
        
        ordered_versions = synchronizer.get_ordered_messages(limit=50)
        
        
        messages_list = []
        for msg_version in ordered_versions:
            msg = session.get(EventMessage, msg_version.message_id)
            if not msg:
                continue
                
            msg_user = session.get(User, msg.user_id)
            created_at_str = msg.created_at.isoformat()
            if msg.created_at.tzinfo is None:
                created_at_str = msg.created_at.replace(tzinfo=timezone.utc).isoformat()
            if not created_at_str.endswith('Z') and msg.created_at.tzinfo == timezone.utc:
                created_at_str = created_at_str.replace('+00:00', 'Z')
            
            
            is_read = False
            if user_id:
                read_record = session.exec(
                    select(MessageRead).where(
                        MessageRead.message_id == msg.id,
                        MessageRead.user_id == user_id
                    )
                ).first()
                is_read = read_record is not None
            
            messages_list.append({
                "id": msg.id,
                "content": msg.content if not msg.is_deleted else "",
                "is_deleted": msg.is_deleted,
                "created_at": created_at_str,
                "vector_clock": msg_version.vector_clock,  
                "version": msg_version.version,
                "is_read_by_me": is_read,
                "user": {
                    "id": msg_user.id if msg_user else user_id,
                    "name": msg_user.name if msg_user else "Unknown",
                    "email": msg_user.email if msg_user else "",
                    "photo_url": msg_user.photo_url if msg_user else None,
                    "is_verified": msg_user.is_verified if msg_user else False
                }
            })
        
        await websocket.send_json({
            "type": "initial_messages",
            "messages": messages_list
        })
        
        
        await broadcast_to_event(event_id, user_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "user_photo_url": user_photo_url
        })
        
        
        try:
            while True:
                
                if websocket.client_state.name != "CONNECTED":
                    break
                
                try:
                    data = await websocket.receive_json()
                    message_type = data.get("type")
                    
                    
                    if message_type == "sync_message":
                        
                        incoming_msg = data.get("message")
                        if incoming_msg:
                            synchronizer = get_synchronizer(str(event_id), "event")
                            msg_version = MessageVersion(
                                message_id=incoming_msg.get("id"),
                                vector_clock=incoming_msg.get("vector_clock", {}),
                                content=incoming_msg.get("content", ""),
                                user_id=incoming_msg.get("user_id"),
                                created_at=datetime.fromisoformat(incoming_msg.get("created_at", "").replace('Z', '+00:00'))
                            )
                            is_new, merged = synchronizer.merge_message(msg_version)
                            if is_new:
                                
                                await broadcast_to_event(event_id, user_id, {
                                    "type": "new_message",
                                    "message": incoming_msg
                                })
                        continue
                    
                    if message_type == "message":
                        
                        content = data.get("content", "").strip()
                        if not content or len(content) > 1000:
                            continue
                        
                        
                        synchronizer = get_synchronizer(str(event_id), "event")
                        
                        
                        message = EventMessage(
                            event_id=event_id,
                            user_id=user_id,
                            content=content
                        )
                        session.add(message)
                        session.commit()
                        session.refresh(message)
                        
                        
                        created_at = message.created_at
                        if created_at.tzinfo is None:
                            created_at = created_at.replace(tzinfo=timezone.utc)
                        
                        msg_version = synchronizer.create_message_version(
                            message_id=message.id,
                            user_id=user_id,
                            content=content,
                            created_at=created_at
                        )
                        
                        
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        
                        created_at_str = message.created_at.isoformat()
                        if message.created_at.tzinfo is None:
                            created_at_str = message.created_at.replace(tzinfo=timezone.utc).isoformat()
                        if not created_at_str.endswith('Z') and message.created_at.tzinfo == timezone.utc:
                            created_at_str = created_at_str.replace('+00:00', 'Z')
                        
                        
                        msg_user = session.get(User, user_id)
                        
                        
                        await broadcast_to_event(event_id, None, {
                            "type": "new_message",
                            "message": {
                                "id": message.id,
                                "content": message.content,
                                "is_deleted": False,
                                "created_at": created_at_str,
                                "vector_clock": msg_version.vector_clock,  
                                "version": msg_version.version,
                                "is_read_by_me": False,
                                "user": {
                                    "id": user_id,
                                    "name": msg_user.name if msg_user else user_name,
                                    "email": msg_user.email if msg_user else user_email,
                                    "photo_url": msg_user.photo_url if msg_user else user_photo_url,
                                    "is_verified": msg_user.is_verified if msg_user else False
                                }
                            }
                        })
                    
                    elif message_type == "typing":
                        
                        typing_status[event_id][user_id] = datetime.now(timezone.utc)
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        
                        await broadcast_to_event(event_id, user_id, {
                            "type": "typing",
                            "user_id": user_id,
                            "user_name": user_name
                        })
                    
                    elif message_type == "presence_ping":
                        
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        
                        now = datetime.now(timezone.utc)
                        online_users = []
                        if event_id in event_connections:
                            for uid in event_connections[event_id].keys():
                                if uid != user_id and uid in user_presence:
                                    if (now - user_presence[uid]).total_seconds() < PRESENCE_TIMEOUT_SECONDS:
                                        online_users.append(uid)
                        
                        await websocket.send_json({
                            "type": "presence_update",
                            "online_users": online_users
                        })
                    
                    elif message_type == "mark_read":
                        
                        message_id = data.get("message_id")
                        if message_id:
                            try:
                                
                                existing_read = session.exec(
                                    select(MessageRead).where(
                                        MessageRead.message_id == message_id,
                                        MessageRead.message_type == "event",
                                        MessageRead.user_id == user_id
                                    )
                                ).first()
                                
                                if not existing_read:
                                    read_record = MessageRead(
                                        message_id=message_id,
                                        message_type="event",  
                                        user_id=user_id
                                    )
                                    session.add(read_record)
                                    session.commit()
                                    
                                    
                                    await broadcast_to_event(event_id, user_id, {
                                        "type": "message_read",
                                        "message_id": message_id,
                                        "user_id": user_id
                                    })
                            except Exception as e:
                                
                                session.rollback()
                                print(f"Error marking message as read: {e}")
                                
                except WebSocketDisconnect:
                    
                    print("WebSocket disconnected normally")
                    break
                except RuntimeError as e:
                    
                    if "disconnect" in str(e).lower():
                        print("WebSocket disconnected (RuntimeError)")
                        break
                    
                    raise
                except Exception as e:
                    
                    print(f"Error processing WebSocket message: {e}")
                    
                    if websocket.client_state.name != "CONNECTED":
                        break
                    continue
                
        except WebSocketDisconnect:
            print("WebSocket disconnected normally")
            pass
        except RuntimeError as e:
            
            if "disconnect" in str(e).lower():
                print("WebSocket disconnected (RuntimeError in outer catch)")
            else:
                print(f"WebSocket RuntimeError: {e}")
        except Exception as e:
            
            print(f"WebSocket error in main loop: {e}")
            import traceback
            traceback.print_exc()
        finally:
            
            if event_id in event_connections and user_id in event_connections[event_id]:
                del event_connections[event_id][user_id]
            
            
            await broadcast_to_event(event_id, user_id, {
                "type": "user_left",
                "user_id": user_id
            })
    finally:
        
        try:
            if 'session_gen' in locals():
                try:
                    next(session_gen)
                except StopIteration:
                    pass
                except Exception:
                    try:
                        session_gen.close()
                    except:
                        pass
        except:
            pass

async def broadcast_to_event(event_id: int, exclude_user_id: Optional[int], message: Dict):
    """Broadcast message to all connected users in an event"""
    if event_id not in event_connections:
        return
    
    disconnected = []
    for user_id, ws in event_connections[event_id].items():
        if exclude_user_id is None or user_id != exclude_user_id:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(user_id)
    
    
    for user_id in disconnected:
        if event_id in event_connections and user_id in event_connections[event_id]:
            del event_connections[event_id][user_id]
