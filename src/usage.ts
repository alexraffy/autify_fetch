

export function usage() {
    console.log("Usage: node lib/main.js --dest=PATH [OPTIONS] URI [URI2 ...]");
    console.log("");
    console.log("Arguments");
    console.log("--dest=PATH Folder where to save the fetched URIs");
    console.log("URI Address of the HTML resource to fetch");
    console.log("");
    console.log("Options");
    console.log("--help Print this information");
    console.log("--metadata Print information about each URI inspected.");
    console.log("");
    console.log("Example")
    console.log("node lib/main.js --dest=./data --metadata https://autify.com");
}