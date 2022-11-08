import {TRunningContext} from "./TRunningContext";


export async function shutdown(context?: TRunningContext) {
    if (context && context.browser) {
        await context.browser.close();
    }
    process.exit(0);
}