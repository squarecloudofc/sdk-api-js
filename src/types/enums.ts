export enum UserPlanName {
  Free = "free",
  Basic = "basic",
  Medium = "medium",
  Advanced = "advanced",
  Senior = "senior",
  Deluxe = "deluxe",
  Orion = "orion",
  Ultimate = "ultimate",
}

export enum ApplicationLanguage {
  JavaScript = "javascript",
  TypeScript = "typescript",
  Python = "python",
  Java = "java",
  Rust = "rust",
  Go = "go",
}

export enum ApplicationLanguageVersion {
  Recommended = "recommended",
  Latest = "latest",
}

export enum ApplicationStatus {
  Exited = "exited",
  Created = "created",
  Starting = "starting",
  Restarting = "restarting",
  Deleting = "deleting",
  Running = "running",
}

export enum ApplicationFileType {
  Directory = "directory",
  File = "file",
}
