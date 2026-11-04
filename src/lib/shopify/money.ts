import type { Money } from './types';

export const formatMoney = ({ amount, currencyCode }: Money) =>
	new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(Number(amount));
