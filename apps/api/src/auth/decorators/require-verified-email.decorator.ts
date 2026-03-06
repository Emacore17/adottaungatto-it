import { SetMetadata } from '@nestjs/common';
import { REQUIRED_VERIFIED_EMAIL_KEY } from '../constants';

export const RequireVerifiedEmail = () => SetMetadata(REQUIRED_VERIFIED_EMAIL_KEY, true);
