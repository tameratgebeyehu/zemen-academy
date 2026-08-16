export type EthiopianDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface EthiopianTimeOption {
  value: string;
  label: string;
}

export function isValidLocalTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function ethiopianDayPeriod(hour: number): EthiopianDayPeriod {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18) return 'evening';
  return 'night';
}

/** Converts a stored device time such as 19:30 into 1:30 evening. */
export function formatEthiopianTime(value: string): string {
  if (!isValidLocalTime(value)) return value;
  const [hourText = '0', minute = '00'] = value.split(':');
  const hour = Number(hourText);
  const ethiopianHour = ((hour + 5) % 12) + 1;
  return `${ethiopianHour}:${minute} ${ethiopianDayPeriod(hour)}`;
}

const LOCAL_STUDY_TIMES = [
  '06:30',
  '07:00',
  '08:00',
  '12:00',
  '13:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

export const ETHIOPIAN_STUDY_TIME_OPTIONS: EthiopianTimeOption[] = LOCAL_STUDY_TIMES.map((value) => ({
  value,
  label: formatEthiopianTime(value),
}));
