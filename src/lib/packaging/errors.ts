export class PackagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class MissingDependencyError extends PackagingError {
  constructor(binary: string, installHint?: string) {
    super(installHint ? `${binary} is required. ${installHint}` : `${binary} is required.`);
  }
}

export class MissingProjectFileError extends PackagingError {
  constructor(filePath: string) {
    super(`Required project file not found: ${filePath}`);
  }
}

export class UnsupportedLanguageError extends PackagingError {
  constructor(language: string) {
    super(`${language} packaging is not supported yet.`);
  }
}

export class ArtifactSizeError extends PackagingError {
  constructor(limitBytes: number, actualBytes: number) {
    super(`Packaged artifact exceeds ${limitBytes} bytes (actual: ${actualBytes}).`);
  }
}
