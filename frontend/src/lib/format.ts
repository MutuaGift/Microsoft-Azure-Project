export const pct = (x: number) => Math.round(x * 100)
export const tone = (p: number) => (p >= 80 ? 'good' : p >= 50 ? 'warn' : 'bad')
