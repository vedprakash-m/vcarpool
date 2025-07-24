import { cn } from '../../lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2 py-1', 'px-3')).toBe('py-1 px-3');
  });

  it('should handle conditional classes', () => {
    expect(cn('base-class', true && 'conditional-class')).toBe(
      'base-class conditional-class'
    );
    expect(cn('base-class', false && 'conditional-class')).toBe('base-class');
  });

  it('should handle object syntax', () => {
    expect(cn('base-class', { active: true, disabled: false })).toBe(
      'base-class active'
    );
  });

  it('should handle arrays', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined)).toBe('');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    // Note: p-4 and px-2 should coexist - px-2 overrides horizontal padding
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2');
  });

  it('should handle complex combinations', () => {
    const result = cn(
      'px-2 py-1 bg-red-500',
      true && 'hover:bg-red-600',
      false && 'disabled',
      { active: true, hidden: false },
      ['text-white', 'font-bold']
    );
    expect(result).toBe(
      'px-2 py-1 bg-red-500 hover:bg-red-600 active text-white font-bold'
    );
  });
});
