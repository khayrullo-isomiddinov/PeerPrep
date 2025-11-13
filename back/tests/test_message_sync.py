"""
Comprehensive tests for message synchronization system
Tests vector clocks, causal ordering, conflict resolution, and performance
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.services.message_sync import (
    VectorClock, MessageVersion, MessageSynchronizer, get_synchronizer
)


class TestVectorClock:
    """Tests for VectorClock class"""
    
    def test_clock_initialization(self):
        """Test vector clock initialization"""
        clock = VectorClock(1)
        assert clock.node_id == 1
        assert clock.to_dict() == {1: 0}
    
    def test_clock_tick(self):
        """Test clock ticking"""
        clock = VectorClock(1)
        assert clock.tick() == 1
        assert clock.tick() == 2
        assert clock.to_dict() == {1: 2}
    
    def test_clock_update(self):
        """Test clock update with another clock"""
        clock1 = VectorClock(1)
        clock1.tick()
        clock1.tick()
        
        clock2 = VectorClock(2)
        clock2.tick()
        
        clock1.update(clock2.to_dict())
        assert clock1.clock[1] >= 2
        assert clock1.clock[2] == 1
    
    def test_happens_before(self):
        """Test happens-before relationship"""
        clock1 = VectorClock(1)
        clock1.tick()
        
        clock2 = VectorClock(2)
        clock2.tick()
        clock2.update(clock1.to_dict())
        
        assert clock1.happens_before(clock2.to_dict())
        assert not clock2.happens_before(clock1.to_dict())
    
    def test_concurrent_clocks(self):
        """Test concurrent (non-causal) clocks"""
        clock1 = VectorClock(1)
        clock1.tick()
        
        clock2 = VectorClock(2)
        clock2.tick()
        
        # These should be concurrent (no causal relationship)
        assert clock1.concurrent(clock2.to_dict())
    
    def test_clock_copy(self):
        """Test clock copying"""
        clock1 = VectorClock(1)
        clock1.tick()
        clock1.tick()
        
        clock2 = clock1.copy()
        assert clock2.to_dict() == clock1.to_dict()
        assert clock2.node_id == clock1.node_id
        
        # Modifying copy shouldn't affect original
        clock2.tick()
        assert clock2.to_dict() != clock1.to_dict()


class TestMessageVersion:
    """Tests for MessageVersion class"""
    
    def test_message_version_creation(self):
        """Test message version creation"""
        now = datetime.now(timezone.utc)
        version = MessageVersion(
            message_id=1,
            vector_clock={1: 1, 2: 0},
            content="Test message",
            user_id=1,
            created_at=now
        )
        
        assert version.message_id == 1
        assert version.vector_clock == {1: 1, 2: 0}
        assert version.content == "Test message"
        assert version.user_id == 1
        assert version.version == 1
    
    def test_message_version_to_dict(self):
        """Test message version serialization"""
        now = datetime.now(timezone.utc)
        version = MessageVersion(
            message_id=1,
            vector_clock={1: 1},
            content="Test",
            user_id=1,
            created_at=now
        )
        
        data = version.to_dict()
        assert data["message_id"] == 1
        assert data["vector_clock"] == {1: 1}
        assert data["content"] == "Test"
        assert data["user_id"] == 1


class TestMessageSynchronizer:
    """Tests for MessageSynchronizer class"""
    
    def test_synchronizer_initialization(self):
        """Test synchronizer initialization"""
        sync = MessageSynchronizer("group-1")
        assert sync.group_id == "group-1"
        assert len(sync.vector_clocks) == 0
        assert len(sync.message_versions) == 0
    
    def test_create_message_version(self):
        """Test creating a new message version"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        version = sync.create_message_version(
            message_id=1,
            user_id=1,
            content="Hello",
            created_at=now
        )
        
        assert version.message_id == 1
        assert version.user_id == 1
        assert version.content == "Hello"
        assert version.vector_clock[1] == 1
        assert 1 in sync.message_versions
    
    def test_causal_ordering(self):
        """Test that messages are ordered causally"""
        sync = MessageSynchronizer("group-1")
        base_time = datetime.now(timezone.utc)
        
        # Create messages in non-chronological order
        msg3 = sync.create_message_version(3, 1, "Third", base_time + timedelta(seconds=3))
        msg1 = sync.create_message_version(1, 1, "First", base_time + timedelta(seconds=1))
        msg2 = sync.create_message_version(2, 2, "Second", base_time + timedelta(seconds=2))
        
        # Get ordered messages
        ordered = sync.get_ordered_messages()
        
        # Should be in causal order (by vector clock, then timestamp)
        assert len(ordered) == 3
        # First message should have lowest vector clock
        assert ordered[0].message_id == 1 or ordered[0].vector_clock[1] <= ordered[1].vector_clock.get(1, 0)
    
    def test_concurrent_messages(self):
        """Test handling of concurrent messages"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        # Create two concurrent messages (same timestamp, different users)
        msg1 = sync.create_message_version(1, 1, "Message 1", now)
        msg2 = sync.create_message_version(2, 2, "Message 2", now)
        
        # Both should be in the system
        assert 1 in sync.message_versions
        assert 2 in sync.message_versions
        
        # Should be able to order them (deterministic)
        ordered = sync.get_ordered_messages()
        assert len(ordered) == 2
    
    def test_merge_message_new(self):
        """Test merging a new message"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        version = MessageVersion(1, {1: 1}, "New message", 1, now)
        is_new, merged = sync.merge_message(version)
        
        assert is_new is True
        assert merged is not None
        assert merged.message_id == 1
        assert 1 in sync.message_versions
    
    def test_merge_message_existing(self):
        """Test merging an existing message"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        # Create initial message
        version1 = sync.create_message_version(1, 1, "Original", now)
        
        # Try to merge same version
        version2 = MessageVersion(1, {1: 1}, "Original", 1, now)
        is_new, merged = sync.merge_message(version2)
        
        assert is_new is False
        assert merged.message_id == 1
    
    def test_conflict_resolution(self):
        """Test conflict resolution for concurrent edits"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        # Create initial message
        version1 = MessageVersion(1, {1: 1}, "Original", 1, now)
        sync.merge_message(version1)
        
        # Create concurrent edit (same version, different content)
        version2 = MessageVersion(1, {1: 1}, "Edited", 2, now + timedelta(seconds=1))
        is_new, resolved = sync.merge_message(version2)
        
        # Should resolve conflict (last-write-wins)
        assert is_new is True
        assert resolved.content == "Edited"  # Newer timestamp wins
    
    def test_initialize_message_version(self):
        """Test initializing message version from database"""
        sync = MessageSynchronizer("group-1")
        now = datetime.now(timezone.utc)
        
        version = sync.initialize_message_version(1, 1, "From DB", now)
        
        assert version.message_id == 1
        assert version.user_id == 1
        assert version.content == "From DB"
        assert 1 in sync.message_versions


class TestGetSynchronizer:
    """Tests for get_synchronizer function"""
    
    def test_get_synchronizer_same_group(self):
        """Test getting synchronizer for same group"""
        sync1 = get_synchronizer("group-1", "group")
        sync2 = get_synchronizer("group-1", "group")
        
        assert sync1 is sync2  # Should be same instance
    
    def test_get_synchronizer_different_groups(self):
        """Test getting synchronizers for different groups"""
        sync1 = get_synchronizer("group-1", "group")
        sync2 = get_synchronizer("group-2", "group")
        
        assert sync1 is not sync2
        assert sync1.group_id == "group-1"
        assert sync2.group_id == "group-2"
    
    def test_get_synchronizer_different_types(self):
        """Test getting synchronizers for different context types"""
        sync1 = get_synchronizer("1", "group")
        sync2 = get_synchronizer("1", "event")
        
        assert sync1 is not sync2


class TestPerformance:
    """Performance benchmarks for message synchronization"""
    
    def test_large_message_ordering_performance(self, benchmark):
        """Benchmark ordering of large number of messages"""
        sync = MessageSynchronizer("perf-test")
        base_time = datetime.now(timezone.utc)
        
        # Create 100 messages
        for i in range(100):
            sync.create_message_version(
                message_id=i,
                user_id=i % 5,  # 5 users
                content=f"Message {i}",
                created_at=base_time + timedelta(seconds=i)
            )
        
        # Benchmark ordering
        result = benchmark(sync.get_ordered_messages, limit=50)
        assert len(result) == 50
    
    def test_concurrent_merge_performance(self, benchmark):
        """Benchmark merging concurrent messages"""
        sync = MessageSynchronizer("perf-test")
        now = datetime.now(timezone.utc)
        
        def merge_messages():
            for i in range(50):
                version = MessageVersion(i, {i % 5: i}, f"Msg {i}", i % 5, now)
                sync.merge_message(version)
        
        benchmark(merge_messages)
        assert len(sync.message_versions) == 50


class TestValidation:
    """Validation tests to ensure algorithms work correctly"""
    
    def test_vector_clock_consistency(self):
        """Validate vector clock consistency properties"""
        clock1 = VectorClock(1)
        clock2 = VectorClock(2)
        
        clock1.tick()
        clock2.tick()
        clock2.update(clock1.to_dict())
        
        # clock1 should happen before clock2
        assert clock1.happens_before(clock2.to_dict())
        assert not clock2.happens_before(clock1.to_dict())
        
        # clock2 should not be concurrent with clock1
        assert not clock1.concurrent(clock2.to_dict())
    
    def test_causal_ordering_property(self):
        """Validate that causal ordering is preserved"""
        sync = MessageSynchronizer("validation-test")
        base_time = datetime.now(timezone.utc)
        
        # Create message chain: A -> B -> C
        msg_a = sync.create_message_version(1, 1, "A", base_time)
        msg_b = sync.create_message_version(2, 1, "B", base_time + timedelta(seconds=1))
        msg_c = sync.create_message_version(3, 1, "C", base_time + timedelta(seconds=2))
        
        ordered = sync.get_ordered_messages()
        
        # All messages should be present
        msg_ids = [m.message_id for m in ordered]
        assert 1 in msg_ids
        assert 2 in msg_ids
        assert 3 in msg_ids
        
        # Vector clocks should be monotonically increasing for same user
        user1_msgs = [m for m in ordered if m.user_id == 1]
        for i in range(len(user1_msgs) - 1):
            vc1 = VectorClock(user1_msgs[i].user_id, user1_msgs[i].vector_clock)
            vc2 = VectorClock(user1_msgs[i+1].user_id, user1_msgs[i+1].vector_clock)
            assert vc1.happens_before(vc2.to_dict()) or vc1.vector_clock[1] <= vc2.vector_clock[1]
    
    def test_conflict_resolution_determinism(self):
        """Validate that conflict resolution is deterministic"""
        sync = MessageSynchronizer("validation-test")
        now = datetime.now(timezone.utc)
        
        # Create two concurrent versions with same timestamp
        version1 = MessageVersion(1, {1: 1}, "Version 1", 1, now)
        version2 = MessageVersion(1, {1: 1}, "Version 2", 2, now)
        
        # Merge both
        sync.merge_message(version1)
        is_new, resolved = sync.merge_message(version2)
        
        # Should always resolve to same result (higher user_id wins)
        assert resolved.user_id == 2
        assert resolved.content == "Version 2"
    
    def test_message_ordering_completeness(self):
        """Validate that all messages are included in ordering"""
        sync = MessageSynchronizer("validation-test")
        base_time = datetime.now(timezone.utc)
        
        # Create messages
        for i in range(10):
            sync.create_message_version(i, i % 3, f"Msg {i}", base_time + timedelta(seconds=i))
        
        ordered = sync.get_ordered_messages()
        
        # All 10 messages should be present
        assert len(ordered) == 10
        msg_ids = {m.message_id for m in ordered}
        assert msg_ids == set(range(10))

