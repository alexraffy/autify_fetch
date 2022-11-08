# autify_fetch

Hi!

This is Autify's Backend Engineer Take Home Test

I chose to use Typescript with puppeteer for this assignment.

The script will spawn a chrome instance running in headless mode.

Then it will navigate to the pages specified and then look for a, img, picture, script and link elements.

Images, scripts are downloaded and elements in the page are modified so that they point to a local copy instead of the remote ones.

Finally, the page is saved (to index.html if the address does not contain a page).


A destination folder is necessary, and the script will create a folder for the domain of the page requested.


## Usage

    Usage: node lib/main.js --dest=PATH [OPTIONS] URI [URI2 ...]

    Arguments
    --dest=PATH Folder where to save the fetched URIs
    URI Address of the HTML resource to fetch

    Options
    --help Print this information
    --metadata Print information about each URI inspected.

    Example
    node lib/main.js --dest=./data --metadata https://autify.com



The script is build this way
    
    npm install
    npm run build_with_docker

To run it using docker
        
    Windows cmd.exe 
    docker run --rm -i --name autify_fetch_test --volume=%CD%\data:/data autify_fetch:latest node lib/main.js --metadata --dest=/data https://www.google.com https://autify.com
    Linux/Mac
    docker run --rm -i --name autify_fetch_test --volume=`pwd`/data:/data autify_fetch:latest node lib/main.js --metadata --dest=/data https://www.google.com https://autify.com

## Not implemented due to time 
Integrations test:

Testing against google.com is not ideal as the page can change.<br>
Instead, a test HTML file should be created and served from a server.<br>
The test script can then spawn the docker image and after completion, check that the downloaded content is similar to the test HTML file.

Refactoring:

Instead of multiple evaluate calls to puppeteer, the processElements function in FetchPage should be one evaluate call.<br>
That would also eliminate duplicate code as the function passed to evaluate is transformed to a string and sent to chrome for execution.


## Known Issues

- Images in CSS are not parsed
- Links with no extensions are not loaded correctly
- Reading file statistics on a mounted volume in docker does not return the right modification date.
- For autify.com, the line window.pagePath="/" in the webpage source causes Chrome and Edge to redirect to the root of the local hard-drive. (The page is viewable in Firefox though).


## Critic

Instead of looking for different elements on the DOM, a better solution might be to monitor network requests in puppeteer and intercept responses and save them to disk.
<br>
All in all this was a fun exercise, and I'm interested in what else puppeteer can be used for:
- Is there console errors on load ?
- How does the page responds if some network connections fail? Does the webpage display a nice error message and inform the user how to retry...

