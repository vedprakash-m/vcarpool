# Git Hooks - Quick Reference

## 🚀 Hook Performance Modes

### Standard Mode (Default)

```bash
git push
```

- **Time**: ~15-20 seconds
- **Checks**: Type checking, basic builds, essential tests
- **Use**: Normal development workflow

### Ultra-Fast Mode

```bash
FAST_PUSH=1 git push
```

- **Time**: ~3-5 seconds
- **Checks**: Type checking only, basic security
- **Use**: When you need to push quickly

### Emergency Mode

```bash
git push --no-verify
```

- **Time**: Instant
- **Checks**: None (CI will validate)
- **Use**: True emergencies only

## 🛠️ Manual Hook Testing

```bash
# Test standard pre-push
./scripts/pre-push-optimized.sh

# Test ultra-fast pre-push
./scripts/pre-push-ultra-fast.sh

# Test pre-commit
./scripts/pre-commit-fast.sh
```

## 🎯 Performance Targets

| Hook                  | Target Time | What It Does                       |
| --------------------- | ----------- | ---------------------------------- |
| Pre-commit            | <5s         | Type check & lint staged files     |
| Pre-push (standard)   | <20s        | Build validation + essential tests |
| Pre-push (ultra-fast) | <5s         | Type checking only                 |

## 💡 Tips

- Use `FAST_PUSH=1` when you're confident your code works
- Standard mode will catch most issues before CI
- Full test suite runs in CI pipeline regardless
- Dependencies are installed automatically if missing
