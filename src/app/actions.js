/**
 * @file src/app/actions.js
 *
 * RE-EXPORT PROXY — do not add new Server Actions here.
 *
 * This file exists only for backward compatibility so that all existing
 * import sites (e.g. `import { submitOrderAction } from '@/app/actions'`)
 * continue to resolve without any changes.
 *
 * Add new actions to the appropriate domain file inside src/app/actions/:
 *   - product.actions.js   — product CRUD, toggle live, discount
 *   - order.actions.js     — submit order, draft, update, bulk ops, trash
 *   - coupon.actions.js    — coupon validation
 *   - settings.actions.js  — store settings save
 */

export * from './actions/product.actions';
export * from './actions/order.actions';
export * from './actions/coupon.actions';
export * from './actions/settings.actions';
export * from './actions/feedback.actions';
