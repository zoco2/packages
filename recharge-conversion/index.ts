/** Custom recharge is entered in points; ratio is points per yuan. */
export function customRechargeAmount(points: unknown, ratio: unknown = '1'): string {
    const units = (value: unknown) => {
        const text = String(value ?? '')
        if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text)) return 0
        const [whole, fraction = ''] = text.split('.')
        return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    }
    const pointUnits = units(points), ratioUnits = units(ratio)
    if (!pointUnits || !ratioUnits || ratioUnits > 100000000) return ''
    const cents = Math.ceil(pointUnits * 100 / ratioUnits)
    if (cents > 9999999999) return ''
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}
