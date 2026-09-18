import { useEffect, useContext } from 'react';
import { WindowsContext } from '../../../src/ui/windows/context';
import { windowManagerRef } from './windowManagerRef';

/** Records the surrounding provider's manager so tests can drive and inspect it. */
export function ManagerProbe() {
    const wm = useContext(WindowsContext)!.wm;
    useEffect(() => {
        windowManagerRef.current = wm;
    });
    return null;
}
