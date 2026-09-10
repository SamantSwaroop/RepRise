import { useToastStore, toast } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with null toast', () => {
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('displays a success toast with message and type', () => {
    toast.success('Workout saved');
    const current = useToastStore.getState().toast;
    expect(current).not.toBeNull();
    expect(current?.message).toBe('Workout saved');
    expect(current?.type).toBe('success');
  });

  it('displays error and warning toasts', () => {
    toast.error('Sync failed');
    expect(useToastStore.getState().toast?.type).toBe('error');

    toast.warning('Offline mode');
    expect(useToastStore.getState().toast?.type).toBe('warning');
  });

  it('auto-dismisses after duration expires', () => {
    toast.info('Info notice', 2000);
    expect(useToastStore.getState().toast).not.toBeNull();

    jest.advanceTimersByTime(2100);
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('hides toast immediately on hideToast()', () => {
    toast.success('Done');
    useToastStore.getState().hideToast();
    expect(useToastStore.getState().toast).toBeNull();
  });
});
