import { getSelectOptions } from './field-settings';

describe('getSelectOptions', () => {
  it('returns an empty array when settings.options is missing', () => {
    expect(getSelectOptions({})).toEqual([]);
  });

  it('returns an empty array when settings.options is not an array', () => {
    expect(getSelectOptions({ options: 'train' })).toEqual([]);
  });

  it('returns valid { value, label } entries', () => {
    const settings = {
      options: [
        { value: 'train', label: '電車' },
        { value: 'bus', label: 'バス' },
      ],
    };

    expect(getSelectOptions(settings)).toEqual([
      { value: 'train', label: '電車' },
      { value: 'bus', label: 'バス' },
    ]);
  });

  it('filters out malformed entries instead of trusting the shape', () => {
    const settings = {
      options: [
        { value: 'train', label: '電車' },
        { value: 'bus' }, // missing label
        { label: 'no value' }, // missing value
        'plain string',
        null,
        42,
        { value: 1, label: '数値value' }, // wrong types
      ],
    };

    expect(getSelectOptions(settings)).toEqual([
      { value: 'train', label: '電車' },
    ]);
  });
});
