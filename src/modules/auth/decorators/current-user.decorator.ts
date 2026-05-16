import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload =>
    ctx.switchToHttp().getRequest().user,
);
