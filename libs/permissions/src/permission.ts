/* eslint-disable @stylistic/indent-binary-ops */
// eslint-disable-next-line @stylistic/operator-linebreak
export type Permission =
/* Users */
| 'lm:users:create'
| 'lm:users:list'
| 'lm:users:delete'
| 'lm:users:update'
| 'lm:users:change-password'
| 'lm:users:change-email'
| 'lm:users:set-push-notifications'
| 'lm:users:get'
| 'lm:users:lookup'
| 'lm:users:manage'

/* Notifications */
| 'lm:notifications:send'
| 'lm:notifications:get'
| 'lm:notifications:list'
| 'lm:notifications:create'

/* Service Accounts */
| 'lm:service-accounts:create'
| 'lm:service-accounts:update'
| 'lm:service-accounts:delete'
| 'lm:service-accounts:generate-access-token'

/* Service Tokens */
| 'lm:service-tokens:get'
| 'lm:service-tokens:list'
| 'lm:service-tokens:create'
| 'lm:service-tokens:update'
| 'lm:service-tokens:delete'
| 'lm:service-tokens:regenerate'
| 'lm:service-tokens:sync'

/* Binary Files */
| 'lm:binary-files:get'
| 'lm:binary-files:create'

/* Images */
| 'lm:images:get'
| 'lm:images:create'
| 'lm:images:update'
| 'lm:images:delete'

/* Auth - Password Recovery */
| 'lm:auth:create-password-recovery-request'
| 'lm:auth:verify-password-recovery-token'
| 'lm:auth:recover-password'

/* User Roles */
| 'lm:user-roles:get'
| 'lm:user-roles:list'
| 'lm:user-roles:create'
| 'lm:user-roles:update'
| 'lm:user-roles:delete'

/* Topics */
| 'lm:topics:read'
| 'lm:topics:manage'

/* Questions */
| 'lm:questions:read'
| 'lm:questions:manage';
