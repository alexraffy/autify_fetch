
// Check the arguments passed to the script
// Returns a TRunningContext

import * as fs from "fs";

import {TRunningContext} from "./TRunningContext";
import {usage} from "./usage";

export function checkArguments(): TRunningContext | undefined{
    let ret: TRunningContext = {
        folderPath: "",
        displayMetadata: false,
        addresses: [],
        browser: undefined,
        page: undefined
    }

    for (let i = 0; i < process.argv.length; i++) {
        let arg = process.argv[i];
        let argU = arg.toUpperCase();
        if (argU.startsWith("--HELP")) {
            usage();
            return undefined;
        }
        if (argU.startsWith("--METADATA")) {
            ret.displayMetadata = true;
        }
        if (argU.startsWith("--DEST=")) {
            ret.folderPath = arg.replace("--dest=", "").replace("--DEST=", "");
            // lets check if the folder exists
            if (fs.existsSync(ret.folderPath) === false) {
                console.log("DEST FOLDER DOES NOT EXIST.");
                usage();
                return undefined;
            }
        }
        if (argU.startsWith("HTTP")) {
            ret.addresses.push(arg)
        }
    }
    // a dest path must be specified.
    if (ret.folderPath === "") {
        usage();
        return undefined;
    }


    return ret;
}