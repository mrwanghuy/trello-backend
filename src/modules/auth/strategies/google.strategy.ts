import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly enabled: boolean;

  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    const callbackURL = config.get<string>('GOOGLE_CALLBACK_URL') ?? '';
    const enabled = clientID.length > 0;

    super({
      clientID: enabled ? clientID : 'disabled-google-login',
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.enabled = enabled;
    if (!enabled) {
      new Logger(GoogleStrategy.name).warn(
        'GOOGLE_CLIENT_ID is not set - /auth/google route will return 401 until configured',
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    if (!this.enabled) {
      return done(
        new UnauthorizedException('Google login is not configured on this server'),
        false,
      );
    }
    const user = await this.authService.validateGoogleUser(profile);
    done(null, user);
  }
}
