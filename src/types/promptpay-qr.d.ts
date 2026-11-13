declare module "promptpay-qr" {
  export interface PromptPayOptions {
    amount?: number;
  }
  function generatePayload(
    target: string,
    options?: PromptPayOptions
  ): Promise<string> | string;
  export default generatePayload;
}
