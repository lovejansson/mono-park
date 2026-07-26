export const createDebugLogger = (isProd: boolean) => (...args: string[]) => {
    if (!isProd) {
        console.debug(...args);
    }
}