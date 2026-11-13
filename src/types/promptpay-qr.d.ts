declare module "promptpay-qr" {
  export interface PromptPayOptions {
    amount?: number;
  }
  export function generatePayload(
    target: string,
    options?: PromptPayOptions
  ): Promise<string> | string;
}
