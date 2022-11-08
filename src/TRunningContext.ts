import {Browser, Page} from "puppeteer";


export interface TRunningContext {
    folderPath: string; // path to a directory where we save data
    displayMetadata: boolean; // if set to yes, we will output to console metrics
    addresses: string[] // list of addresses to fetch
    browser?: Browser; // puppeteer browser ref
    page?: Page // puppeteer page ref
}