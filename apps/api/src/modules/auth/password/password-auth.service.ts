import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { hash } from 'bcrypt';
import {
  type DataSource, MoreThan, type Repository,
} from 'typeorm';

import { User } from '@/modules/users/user.entity.js';
import { UsersService } from '@/modules/users/users.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { createRandomString } from '@pcg/text-kit';
import { PasswordRecoveryRequest } from './password-recovery-request.entity.js';
import { type RecoverPasswordOptions } from './types/service/index.js';
import { type VerifyPasswordRecoveryOptions } from './types/service/verify-password-recovery-token.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { IdService } from '@/modules/id/id.service.js';
import { ForbiddenError } from '@/errors/forbidden.error.js';
// import { NotificationsService } from '@/modules/notifications/notifications.service.js';
// import { PasswordResetNotification } from '@/modules/notifications/registry/password-reset-notification.entity.js';

@Injectable()
export class PasswordAuthService {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(IdService) private readonly idService: IdService,
    @InjectDataSource() private readonly dataSource: DataSource,
    // @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: PasswordAuthService.name,
    });
  }

  private get userRepository(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  get passwordRecoveryRequestRepository() {
    return this.dataSource.getRepository(PasswordRecoveryRequest);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createPasswordRecoveryRequest(email: string, ctx: ServiceMethodContext): Promise<boolean> {
    // const user = await this.usersService.getOneByEmailOrFail(email, ctx);

    const requestSecurityToken = this.generateTemporaryPassword();
    const expiresAt = new Date(new Date().getTime() + 3600000);

    let request = await this.passwordRecoveryRequestRepository.findOne({
      where: {
        email,
      },
    });

    if (request) {
      request.expiresAt = expiresAt;
      request.token = requestSecurityToken;
    } else {
      request = this.passwordRecoveryRequestRepository.create({
        id: this.idService.generateEntityId('prr'),
        email,
        expiresAt,
        token: requestSecurityToken,
      });
    }

    await this.passwordRecoveryRequestRepository.save(request);

    // await this.notificationsService.create(
    //   PasswordResetNotification,
    //   {
    //     userId: user.id,
    //     referenceId: request.id,
    //     meta: {},
    //   },
    //   ctx,
    // );

    return true;
  }

  async recoverPassword(opts: RecoverPasswordOptions, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod('recoverPassword', ctx, {
      token: opts.token,
      // SECURITY: Never log the plaintext password
    });

    const request = await this.passwordRecoveryRequestRepository.findOneBy({
      token: opts.token,
      expiresAt: MoreThan(new Date()),
    });

    if (!request) {
      throw new ForbiddenError({
        message: 'Password recovery request expired',
        key: 'AUTH_PASSWORD_RECOVERY_REQUEST_EXPIRED',
        context: logger.getContext(),
      });
    }

    if (opts.token !== request.token) {
      throw new ForbiddenError({
        message: 'No access to password recovery session',
        key: 'AUTH_PASSWORD_RECOVERY_FORBIDDEN',
        context: logger.getContext(),
      });
    }

    const user = await this.usersService.getOneByEmailOrFail(request.email, ctx);

    user.passwordHash = await hash(opts.password, 10);

    await Promise.all([
      this.userRepository.save(user),
      this.passwordRecoveryRequestRepository.remove(request),
    ]);
  }

  async verifyPasswordRecoveryToken(opts: VerifyPasswordRecoveryOptions, ctx: ServiceMethodContext): Promise<boolean> {
    const logger = this.logger.forMethod(this.verifyPasswordRecoveryToken.name, ctx);

    const request = await this.passwordRecoveryRequestRepository.findOneBy({
      token: opts.token,
      expiresAt: MoreThan(new Date()),
    });

    if (!request) {
      throw new ForbiddenError({
        message: 'Password recovery request expired',
        key: 'AUTH_PASSWORD_RECOVERY_REQUEST_EXPIRED',
        context: logger.getContext(),
      });
    }

    await this.usersService.getOneByEmailOrFail(request.email, ctx);

    return true;
  }

  generateTemporaryPassword() {
    return createRandomString(7);
  }
}
