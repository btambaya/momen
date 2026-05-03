// Mock for expo-file-system (new File API)
export class File {
  uri: string;
  constructor(dir: any, name: string) {
    this.uri = `file:///mock/${name}`;
  }
  write(_content: string) {}
  get exists() { return false; }
}
export class Directory {
  constructor(_base: any, _name: string) {}
  get exists() { return false; }
  create() {}
}
export const Paths = {
  cache: 'file:///mock/cache',
};
