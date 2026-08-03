type AccessTokenProvider = () => Promise<string | null>;

let provider: AccessTokenProvider = async () => null;

export function setAccessTokenProvider(next: AccessTokenProvider): void {
  provider = next;
}

export function getAccessTokenForNetwork(): Promise<string | null> {
  return provider();
}
