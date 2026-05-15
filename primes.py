def sieve_of_eratosthenes(limit):
    """Return all primes up to and including limit."""
    if limit < 2:
        return []
    is_prime = bytearray([1]) * (limit + 1)
    is_prime[0] = is_prime[1] = 0
    for i in range(2, int(limit**0.5) + 1):
        if is_prime[i]:
            is_prime[i * i::i] = bytearray(len(is_prime[i * i::i]))
    return [i for i, v in enumerate(is_prime) if v]


def is_prime(n):
    """Return True if n is prime."""
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True


def nth_prime(n):
    """Return the nth prime (1-indexed, so nth_prime(1) == 2)."""
    if n < 1:
        raise ValueError("n must be >= 1")
    count, candidate = 0, 1
    while count < n:
        candidate += 1
        if is_prime(candidate):
            count += 1
    return candidate


if __name__ == "__main__":
    print("Primes up to 50:", sieve_of_eratosthenes(50))
    print("Is 97 prime?", is_prime(97))
    print("10th prime:", nth_prime(10))
