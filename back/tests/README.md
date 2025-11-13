# Test Suite Documentation

This directory contains comprehensive tests for the three complex algorithms in the PeerPrep platform.

## Test Structure

- `conftest.py` - Pytest fixtures and test configuration
- `test_message_sync.py` - Tests for vector clock message synchronization
- `test_gamification.py` - Tests for XP calculation and gamification
- `test_mission_analyzer.py` - Tests for NLP quality analysis

## Running Tests

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
pytest
```

### Run Specific Test File

```bash
pytest tests/test_message_sync.py
pytest tests/test_gamification.py
pytest tests/test_mission_analyzer.py
```

### Run with Coverage

```bash
pytest --cov=app.services --cov-report=html
```

### Run Performance Benchmarks

```bash
pytest --benchmark-only
```

### Run Validation Tests Only

```bash
pytest -k "TestValidation"
```

### Run with Verbose Output

```bash
pytest -v
```

## Test Categories

### Unit Tests
- Test individual functions and classes in isolation
- Fast execution
- No external dependencies

### Integration Tests
- Test interactions between components
- Use test database
- Test real workflows

### Performance Benchmarks
- Measure algorithm performance
- Identify bottlenecks
- Track performance regressions

### Validation Tests
- Ensure algorithms work correctly
- Verify mathematical properties
- Check edge cases

## Test Coverage

Each test file includes:

1. **Unit Tests** - Test individual components
2. **Integration Tests** - Test component interactions
3. **Performance Benchmarks** - Measure execution time
4. **Validation Tests** - Verify correctness

## Expected Results

All tests should pass. Performance benchmarks will show execution times. Validation tests ensure algorithms maintain their mathematical properties.

## Troubleshooting

If tests fail:
1. Ensure all dependencies are installed
2. Check that the test database can be created
3. Verify that models are properly imported
4. Check for any missing fixtures

