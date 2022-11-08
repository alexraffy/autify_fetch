import {checkArguments} from "./checkArguments";
import {shutdown} from "./shutdown";
import puppeteer from 'puppeteer';
import {FetchPage} from "./FetchPage";


// Entry-Point
// we check arguments, launch a headless chrome instance and start processing page per page
async function main() {
    let context = checkArguments()
    if (context === undefined) {
        return shutdown(undefined);
    }
    // we pass --no-sandbox so chrome can work in docker
    context.browser = await puppeteer.launch({headless: true, timeout: 30000, waitForInitialPage: true, args: [
            "--no-sandbox",
            '--window-size=1920,1080',
        ] })
    context.page = await context.browser.newPage()

    for (let i = 0; i < context.addresses.length; i++) {
        let p = new FetchPage(context.page, context.addresses[i], context.displayMetadata, context.folderPath);
        await p.run();
    }
    await shutdown(context);

}


main().then(() => {
    console.log("Closing down.")
})