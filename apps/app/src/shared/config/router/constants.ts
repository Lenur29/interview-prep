export enum RoutePath {
  Root = '/',

  Login = '/login',
  AuthCallback = '/auth/callback',

  Dashboard = '/dashboard',
  Topics = '/topics',
  Topic = '/topics/:topicSlug',
  Question = '/questions/:questionSlug',
  Review = '/review',
  Notes = '/notes',
  Account = '/me',

  NotFound = '*',
}
