import {Page} from "puppeteer";
import * as path from "path";
import * as fs from "fs";
import fetch from "cross-fetch"


export class FetchPage {

    readonly address: string; // address of the URI to fetch
    private page: Page; // ref to Puppeteer Page
    readonly hostname: string; // the hostname of the page
    readonly pathname: string; // the document path
    readonly display_metadata: boolean; // do we want to display info
    readonly folder_path: string; // the data folder where we will create the hostname directory
    readonly filename: string; // the filename for the URI on the disk

    // array for a, img, link elements
    private array_links = [];
    private array_images = [];
    private array_scripts = [];

    constructor(page: Page, address: string, display_metadata: boolean, folder_path: string) {
        this.page = page;
        this.address = address;
        const host = new URL(this.address);
        this.hostname = host.host;
        this.pathname = host.pathname;
        this.array_links = [];
        this.array_images = [];
        this.array_scripts = [];
        this.display_metadata = display_metadata;
        this.folder_path = folder_path;
        // name of the HTML file
        let doc = this.pathname;
        if (doc === "" || doc === "/") {
            doc = "index.html"
        }
        if (doc.length > 0 && doc.startsWith("/")) {
            doc = doc.substring(1);
        }
        if (!(doc.endsWith(".htm") || doc.endsWith(".html"))) {
            doc += ".html";
        }
        this.filename = doc;
    }

    async run() {
        console.log("Processing " + this.address);
        const ready = await this.before();
        if (ready === false) {
            return;
        }
        await this.processElements();
        if (this.display_metadata) {
            this.display();
        }
        await this.finalize();
    }

    private async before() {
        try {
            let response = await this.page.goto(this.address, {waitUntil: "load"});
            if (!response.ok()) {
                console.log("ERROR: Page returned " + response.status().toString())
                return false;
            }
        } catch (errorNavigating) {
            console.log("ERROR: " + errorNavigating.message);
            return false;
        }
        await this.page.waitForNetworkIdle({idleTime: 100})

        // scroll to the bottom if some elements are loaded on scroll
        await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        })
        // scroll back up
        await this.page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        return true;
    }


    private async processElements() {
        // get links
        this.array_links = await this.page.evaluate(() => {
            return Array.from(document.getElementsByTagName('a'),
                (a) => { return {title: a.innerText, link: a.href} });
        });

        // get the images list
        this.array_images = await this.page.evaluate((hostname) => {
            let imgArray: (HTMLImageElement | HTMLSourceElement)[]  = Array.from(document.getElementsByTagName("img"));
            // add picture elements
            imgArray.push(...Array.from(document.querySelectorAll<HTMLSourceElement>("picture > source")));

            let array_images: {source: string, dest: string}[] = [];
            let processed_images = [];

            const correctURI = (src): string => {
                if (!src.startsWith("https") && src !== "") {
                    return "https://" + hostname + "/" + src;
                }
                return src;
            }

            const cleanURI = (src): string => {
                let dest = src.trim();
                if (dest.startsWith("http")) {
                    dest = dest.replace("https://" + hostname + "/", "")
                    dest = dest.replace("http://" + hostname + "/", "")
                    dest = dest.replace("https://", "");
                    dest = dest.replace("http://", "");
                }
                if (dest.startsWith("/")) {
                    dest = dest.substring(1);
                }
                while (dest.indexOf(":") > -1) {
                    dest = dest.replace(":", "_");
                }
                while (dest.indexOf("?") > -1) {
                    dest = dest.replace("?", "_");
                }
                // if the link has more than 255 characters, we might have some problems saving it as it,
                // for now we cut it to 255 but replacing the name with a guid would be a better idea.
                if (dest.length > 255) {
                    dest = dest.substring(0, 255);
                }
                return dest;
            }

            for (let i = 0; i < imgArray.length; i++) {
                let img = imgArray[i];
                if (img.src !== undefined && img.src.startsWith("data:") === false && img.src !== "") {
                    let source = img.src;
                    let dest = cleanURI(source);
                    img.src = dest;
                    source = correctURI(source);
                    if (!processed_images.includes(source) && source !== "") {
                        array_images.push({source: source, dest: dest});
                    }
                }
                if (img.srcset !== undefined) {
                    let sets = img.srcset.split(",");
                    let newSet = "";
                    for (let x = 0; x < sets.length; x++) {
                        let parts = sets[x].split(" ");
                        if (parts[0] == "") {
                            continue;
                        }
                        let uri = cleanURI(parts[0]);
                        let uriCorrected = correctURI(parts[0]);
                        newSet += "," + uri + " " + parts[1];
                        if (!processed_images.includes(uriCorrected) && uriCorrected !== "https://" + hostname + "/") {
                            array_images.push({source: uriCorrected, dest: uri});
                        }
                    }
                    if (newSet.length > 0) {
                        newSet = newSet.substring(1);
                    }
                    img.srcset = newSet;
                }
            }

            return array_images;

        }, this.hostname);
        // get the css and scripts
        this.array_scripts = await this.page.evaluate((hostname) => {
            let links: (HTMLScriptElement | HTMLLinkElement)[] = Array.from(document.getElementsByTagName("link"));
            links.push(...Array.from(document.getElementsByTagName("script")))

            return links.filter( (v) => {
                if ((v["src"] !== undefined && v["src"] === "") || (v["href"] !== undefined && v["href"] === "")) {
                    return false;
                }
                return true;

            }).map( (link) => {
                let source = "";
                let dest = "";
                if (link["href"] !== undefined) {
                    source = link["href"];
                    dest = link["href"];
                } else if (link["src"] !== undefined) {
                    source = link["src"];
                    dest = link["src"];
                }

                const correctURI = (src): string => {
                    if (!src.startsWith("https")) {
                        return "https://" + hostname + "/" + src;
                    }
                    return src;
                }

                const cleanURI = (src): string => {
                    let dest = src.trim();
                    if (dest.startsWith("http")) {
                        dest = dest.replace("https://" + hostname + "/", "")
                        dest = dest.replace("http://" + hostname + "/", "")
                        dest = dest.replace("https://", "");
                        dest = dest.replace("http://", "");
                    }
                    if (dest.startsWith("/")) {
                        dest = dest.substring(1);
                    }
                    while (dest.indexOf(":") > -1) {
                        dest = dest.replace(":", "_");
                    }
                    while (dest.indexOf("?") > -1) {
                        dest = dest.replace("?", "_");
                    }
                    // if the link has more than 255 characters, we might have some problems saving it as it,
                    // for now we cut it to 255 but replacing the name with a guid would be a better idea.
                    if (dest.length > 255) {
                        dest = dest.substring(0, 255);
                    }
                    return dest;
                }

                dest = cleanURI(dest);
                let newsource = correctURI(source);

                if (link["href"] !== undefined) {
                    link["href"] = dest;
                } else if (link["src"] !== undefined) {
                    link["src"] = dest;
                }

                return {source: newsource, dest: dest}


            })

        }, this.hostname);

    }

    private display() {
        console.log(`Site: ${this.hostname}`);
        console.log(`Page: ${this.pathname}`);
        console.log(`Number of links: ${this.array_links.length}`);
        console.log(`Number of images: ${this.array_images.length}`);
        console.log(`Number of css/scripts: ${this.array_scripts.length}`);
        // Was the page already downloaded?
        const file = path.normalize(this.folder_path + "/" + this.hostname + "/" + this.filename);
        if (fs.existsSync(file)) {
            const fd = fs.openSync(file, "r");
            const stats = fs.fstatSync(fd);
            console.log(`Last visited: ${stats.birthtime.toISOString()}`);
        }
    }

    private async finalize() {
        // we get the source of the page
        let content = await this.page.content()
        const file = path.normalize(this.folder_path + "/" + this.hostname + "/" + this.filename);
        const dir = path.dirname(file)
        fs.mkdirSync(dir, {recursive: true} );
        let array_all = [...this.array_images, ...this.array_scripts]
        for (let i = 0; i < array_all.length; i++) {
            if (array_all[i].dest === "") {
                continue;
            }
            const image_filename = path.normalize(this.folder_path + "/" + this.hostname + "/" + array_all[i].dest);

            try {

                let image_data = await fetch(new URL(array_all[i].source));
                let buffer = await image_data.arrayBuffer();
                const dir = path.dirname(image_filename)
                fs.mkdirSync(dir, {recursive: true});
                fs.writeFileSync(image_filename, new DataView(buffer));
            } catch (error_downloading_image) {
                console.log("Error downloading or saving image: " + array_all[i].source);
                console.log(array_all[i]);
                console.log("Save path was " + image_filename);
                console.log(error_downloading_image.message);
            }
        }

        // save the document
        fs.writeFileSync(file, content);
        console.log("Saved as: " + file);
    }


}