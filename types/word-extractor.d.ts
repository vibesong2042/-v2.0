declare module "word-extractor" {
  type WordDocument = {
    getBody(): string;
  };

  export default class WordExtractor {
    extract(buffer: Buffer): Promise<WordDocument>;
  }
}
