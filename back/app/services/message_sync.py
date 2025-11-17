"""
Advanced Message Synchronization System with Vector Clocks and Conflict Resolution
Implements causal ordering, version vectors, and operational transformation concepts
for ensuring consistent message ordering across distributed clients.
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timezone
from collections import defaultdict

class VectorClock:
    """Vector clock for causal ordering of messages"""
    def __init__(self, node_id: int, initial_state: Optional[Dict[int, int]] = None):
        self.node_id = node_id
        self.clock = defaultdict(int)
        if initial_state:
            self.clock.update(initial_state)
    
    def tick(self):
        """Increment this node's clock"""
        self.clock[self.node_id] += 1
        return self.clock[self.node_id]
    
    def update(self, other_clock: Dict[int, int]):
        """Merge with another vector clock (take maximum)"""
        for node_id, time in other_clock.items():
            self.clock[node_id] = max(self.clock[node_id], time)
        # Ensure our own clock is at least incremented
        self.clock[self.node_id] = max(self.clock[self.node_id], 0) + 1
    
    def happens_before(self, other: Dict[int, int]) -> bool:
        """Check if this clock happens before another (causal ordering)"""
        at_least_one_less = False
        for node_id in set(list(self.clock.keys()) + list(other.keys())):
            if self.clock[node_id] > other.get(node_id, 0):
                return False
            if self.clock[node_id] < other.get(node_id, 0):
                at_least_one_less = True
        return at_least_one_less
    
    def concurrent(self, other: Dict[int, int]) -> bool:
        """Check if two clocks are concurrent (no causal relationship)"""
        return not self.happens_before(other) and not self._other_happens_before(other)
    
    def _other_happens_before(self, other: Dict[int, int]) -> bool:
        """Check if other clock happens before this"""
        at_least_one_less = False
        for node_id in set(list(self.clock.keys()) + list(other.keys())):
            if other.get(node_id, 0) > self.clock[node_id]:
                return False
            if other.get(node_id, 0) < self.clock[node_id]:
                at_least_one_less = True
        return at_least_one_less
    
    def to_dict(self) -> Dict[int, int]:
        """Convert to dictionary"""
        return dict(self.clock)
    
    def copy(self) -> 'VectorClock':
        """Create a copy"""
        return VectorClock(self.node_id, self.to_dict())


class MessageVersion:
    """Message version with vector clock for ordering"""
    def __init__(self, message_id: int, vector_clock: Dict[int, int], 
                 content: str, user_id: int, created_at: datetime):
        self.message_id = message_id
        self.vector_clock = vector_clock
        self.content = content
        self.user_id = user_id
        self.created_at = created_at
        self.version = max(vector_clock.values()) if vector_clock else 0
    
    def to_dict(self) -> dict:
        return {
            "message_id": self.message_id,
            "vector_clock": self.vector_clock,
            "content": self.content,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "version": self.version
        }


class MessageSynchronizer:
    """Advanced message synchronization with conflict resolution"""
    
    def __init__(self, group_id: str):
        self.group_id = group_id
        self.vector_clocks: Dict[int, VectorClock] = {}  # user_id -> VectorClock
        self.message_versions: Dict[int, MessageVersion] = {}  # message_id -> MessageVersion
        self.pending_messages: List[MessageVersion] = []
    
    def get_or_create_clock(self, user_id: int) -> VectorClock:
        """Get or create vector clock for a user"""
        if user_id not in self.vector_clocks:
            self.vector_clocks[user_id] = VectorClock(user_id)
        return self.vector_clocks[user_id]
    
    def create_message_version(self, message_id: int, user_id: int, 
                              content: str, created_at: datetime) -> MessageVersion:
        """Create a new message version with vector clock"""
        clock = self.get_or_create_clock(user_id)
        clock.tick()
        
        version = MessageVersion(
            message_id=message_id,
            vector_clock=clock.to_dict(),
            content=content,
            user_id=user_id,
            created_at=created_at
        )
        
        self.message_versions[message_id] = version
        return version
    
    def initialize_message_version(self, message_id: int, user_id: int,
                                   content: str, created_at: datetime) -> MessageVersion:
        """
        Initialize a message version for existing messages (from database)
        Creates a vector clock based on message creation time and user
        """
        # For existing messages, create a vector clock that represents
        # the state at the time the message was created
        clock = self.get_or_create_clock(user_id)
        
        # If this is the first message from this user, initialize clock
        # Otherwise, increment to represent this message
        if message_id not in self.message_versions:
            # Check if we have any messages from this user already
            user_messages = [mv for mv in self.message_versions.values() 
                           if mv.user_id == user_id]
            if user_messages:
                # Get the latest message from this user to determine clock value
                latest = max(user_messages, key=lambda m: m.created_at)
                clock.update(latest.vector_clock)
            clock.tick()
        
        version = MessageVersion(
            message_id=message_id,
            vector_clock=clock.to_dict(),
            content=content,
            user_id=user_id,
            created_at=created_at
        )
        
        self.message_versions[message_id] = version
        return version
    
    def merge_message(self, message_version: MessageVersion) -> Tuple[bool, Optional[MessageVersion]]:
        """
        Merge a message version into the system
        Returns: (is_new, merged_version)
        """
        if message_version.message_id in self.message_versions:
            existing = self.message_versions[message_version.message_id]
            
            # Check if this is a newer version
            if message_version.version > existing.version:
                # Update user's clock
                user_clock = self.get_or_create_clock(message_version.user_id)
                user_clock.update(message_version.vector_clock)
                
                # Update message
                self.message_versions[message_version.message_id] = message_version
                return (True, message_version)
            elif message_version.version == existing.version:
                # Same version, check for conflicts
                if message_version.vector_clock != existing.vector_clock:
                    # Concurrent edits - resolve conflict
                    resolved = self._resolve_conflict(existing, message_version)
                    self.message_versions[message_version.message_id] = resolved
                    return (True, resolved)
                return (False, existing)
            else:
                # Older version, ignore
                return (False, existing)
        else:
            # New message
            # Update all clocks based on this message's clock
            for user_id, time in message_version.vector_clock.items():
                clock = self.get_or_create_clock(user_id)
                clock.update({user_id: time})
            
            self.message_versions[message_version.message_id] = message_version
            return (True, message_version)
    
    def _resolve_conflict(self, existing: MessageVersion, incoming: MessageVersion) -> MessageVersion:
        """
        Resolve conflict between concurrent message versions
        Uses last-write-wins with timestamp tiebreaker
        """
        if incoming.created_at > existing.created_at:
            # Incoming is newer, use it
            return incoming
        elif existing.created_at > incoming.created_at:
            # Existing is newer, keep it
            return existing
        else:
            # Same timestamp, use higher user_id as tiebreaker (deterministic)
            if incoming.user_id > existing.user_id:
                return incoming
            return existing
    
    def get_ordered_messages(self, limit: int = 50) -> List[MessageVersion]:
        """
        Get messages in causal order (respecting vector clock ordering)
        Uses topological sort based on happens-before relationship
        """
        messages = list(self.message_versions.values())
        
        # Sort by: 1) max vector clock value, 2) created_at, 3) message_id
        def sort_key(msg: MessageVersion) -> Tuple[int, datetime, int]:
            max_clock = max(msg.vector_clock.values()) if msg.vector_clock else 0
            return (max_clock, msg.created_at, msg.message_id)
        
        sorted_messages = sorted(messages, key=sort_key)
        
        # Build dependency graph for topological sort
        graph = {}
        in_degree = {}
        
        for msg in sorted_messages:
            graph[msg.message_id] = []
            in_degree[msg.message_id] = 0
        
        # Build edges based on happens-before
        for msg1 in sorted_messages:
            for msg2 in sorted_messages:
                if msg1.message_id == msg2.message_id:
                    continue
                
                vc1 = VectorClock(msg1.user_id, msg1.vector_clock)
                if vc1.happens_before(msg2.vector_clock):
                    graph[msg1.message_id].append(msg2.message_id)
                    in_degree[msg2.message_id] += 1
        
        # Topological sort
        queue = [msg_id for msg_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            # Sort queue by timestamp for deterministic ordering
            queue.sort(key=lambda mid: self.message_versions[mid].created_at)
            msg_id = queue.pop(0)
            result.append(self.message_versions[msg_id])
            
            for neighbor in graph[msg_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return result[-limit:] if limit else result
    
    def sync_with_remote(self, remote_messages: List[dict]) -> List[MessageVersion]:
        """
        Synchronize with remote message state
        Returns list of new/updated messages
        """
        updated = []
        
        for remote_msg in remote_messages:
            try:
                created_at_str = remote_msg.get("created_at", "")
                if isinstance(created_at_str, str):
                    if created_at_str.endswith('Z'):
                        created_at_str = created_at_str.replace('Z', '+00:00')
                    created_at = datetime.fromisoformat(created_at_str)
                else:
                    created_at = remote_msg.get("created_at")
                
                msg_version = MessageVersion(
                    message_id=remote_msg.get("message_id") or remote_msg.get("id"),
                    vector_clock=remote_msg.get("vector_clock", {}),
                    content=remote_msg.get("content", ""),
                    user_id=remote_msg.get("user_id"),
                    created_at=created_at
                )
                
                is_new, merged = self.merge_message(msg_version)
                if is_new and merged:
                    updated.append(merged)
            except Exception as e:
                # Skip invalid messages
                print(f"Error syncing message: {e}")
                continue
        
        return updated
    
    def get_sync_state(self) -> dict:
        """Get current synchronization state for client sync"""
        return {
            "vector_clocks": {uid: vc.to_dict() for uid, vc in self.vector_clocks.items()},
            "message_versions": {mid: mv.to_dict() for mid, mv in self.message_versions.items()}
        }


# Global synchronizers for each group/event
_synchronizers: Dict[str, MessageSynchronizer] = {}

def get_synchronizer(context_id: str, context_type: str = "group") -> MessageSynchronizer:
    """Get or create synchronizer for a group/event"""
    key = f"{context_type}:{context_id}"
    if key not in _synchronizers:
        _synchronizers[key] = MessageSynchronizer(context_id)
    return _synchronizers[key]

