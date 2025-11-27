"""
Advanced Message Synchronization System with Vector Clocks and Conflict Resolution
Used only for EVENT chats (groups removed).
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
        self.clock[self.node_id] += 1
        return self.clock[self.node_id]

    def update(self, other_clock: Dict[int, int]):
        for node_id, time in other_clock.items():
            self.clock[node_id] = max(self.clock[node_id], time)
        self.clock[self.node_id] = max(self.clock[self.node_id], 0) + 1

    def happens_before(self, other: Dict[int, int]) -> bool:
        at_least_one_less = False
        for node_id in set(list(self.clock.keys()) + list(other.keys())):
            if self.clock[node_id] > other.get(node_id, 0):
                return False
            if self.clock[node_id] < other.get(node_id, 0):
                at_least_one_less = True
        return at_least_one_less

    def to_dict(self) -> Dict[int, int]:
        return dict(self.clock)

    def copy(self) -> 'VectorClock':
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
            "version": self.version,
        }


class MessageSynchronizer:
    """Advanced message synchronization for EVENT chat"""

    def __init__(self, context_id: str):
        self.context_id = context_id
        self.vector_clocks: Dict[int, VectorClock] = {}
        self.message_versions: Dict[int, MessageVersion] = {}

    def get_or_create_clock(self, user_id: int) -> VectorClock:
        if user_id not in self.vector_clocks:
            self.vector_clocks[user_id] = VectorClock(user_id)
        return self.vector_clocks[user_id]

    def create_message_version(self, message_id: int, user_id: int,
                               content: str, created_at: datetime) -> MessageVersion:
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
        clock = self.get_or_create_clock(user_id)

        if message_id not in self.message_versions:
            user_msgs = [mv for mv in self.message_versions.values()
                         if mv.user_id == user_id]
            if user_msgs:
                latest = max(user_msgs, key=lambda m: m.created_at)
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
        if message_version.message_id in self.message_versions:
            existing = self.message_versions[message_version.message_id]

            if message_version.version > existing.version:
                user_clock = self.get_or_create_clock(message_version.user_id)
                user_clock.update(message_version.vector_clock)
                self.message_versions[message_version.message_id] = message_version
                return True, message_version

            if message_version.version == existing.version:
                if message_version.vector_clock != existing.vector_clock:
                    resolved = self._resolve_conflict(existing, message_version)
                    self.message_versions[message_version.message_id] = resolved
                    return True, resolved
                return False, existing

            return False, existing

        for user_id, time in message_version.vector_clock.items():
            clock = self.get_or_create_clock(user_id)
            clock.update({user_id: time})

        self.message_versions[message_version.message_id] = message_version
        return True, message_version

    def _resolve_conflict(self, existing, incoming):
        if incoming.created_at > existing.created_at:
            return incoming
        if existing.created_at > incoming.created_at:
            return existing
        return incoming if incoming.user_id > existing.user_id else existing

    def get_ordered_messages(self, limit=50):
        msgs = list(self.message_versions.values())

        def sort_key(msg):
            max_clock = max(msg.vector_clock.values()) if msg.vector_clock else 0
            return max_clock, msg.created_at, msg.message_id

        return sorted(msgs, key=sort_key)[-limit:]

    def sync_with_remote(self, remote_messages: List[dict]):
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
                print(f"Error syncing message: {e}")

        return updated

    def get_sync_state(self):
        return {
            "vector_clocks": {uid: vc.to_dict() for uid, vc in self.vector_clocks.items()},
            "message_versions": {mid: mv.to_dict() for mid, mv in self.message_versions.items()},
        }


_synchronizers: Dict[str, MessageSynchronizer] = {}

def get_synchronizer(context_id: str, context_type: str = "event") -> MessageSynchronizer:
    """Get or create synchronizer for event chat (groups removed)"""
    key = f"{context_type}:{context_id}"
    if key not in _synchronizers:
        _synchronizers[key] = MessageSynchronizer(context_id)
    return _synchronizers[key]
