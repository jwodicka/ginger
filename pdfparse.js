import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { promises } from "fs";
  
const pdfPath = "ginger_dictionary_paper_edition_v13.pdf";

const loadingTask = getDocument(pdfPath);

async function explorePdf(doc) {
    const page = await doc.getPage(2);
    // const tree = await page.getAnnotations()
    console.log(typeof page.commonObjs)
    
    for await (const seg of page.streamTextContent()) {
        console.log(seg)
    }
}

async function parsePdf(doc) {
    const pageCount = doc.numPages;
    const metadata = await doc.getMetadata();
    const dictionary = {};
    for (let i = 2; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent()
        const textItems = content.items
            .filter(item => item.str.trim() != "") // Remove blanks
            .filter(item => item.fontName != "g_d0_f2") // Remove footers
        let word = null;
        let definition = "";
        for (const item of textItems) {
            const [_a, _b, _c, _d, xOffset, yOffset] = item.transform;
            if (xOffset == "56.25") {
                if (word != null) {
                    dictionary[word] = definition.trim();
                }
                word = item.str
                definition = ""
            } else if (xOffset == "124.5") {
                definition = definition.concat(" ", item.str);
            } else {
                console.error(`That's unexpected! ${xOffset}`)
            }
            // console.log(xOffset, yOffset);
        }
        if (word != null) {
          dictionary[word] = definition.trim();
        }
    }
    return dictionary;
}

function saveJson(dictionary) {
    return promises.writeFile("dictionary.json", JSON.stringify(dictionary));
}

loadingTask.promise.then(parsePdf).then(saveJson);
// loadingTask.promise.then(explorePdf);

/*
loadingTask.promise
  .then(function (doc) {
    const numPages = doc.numPages;
    console.log("# Document Loaded");
    console.log("Number of Pages: " + numPages);
    console.log();

    let lastPromise; // will be used to chain promises
    lastPromise = doc.getMetadata().then(function (data) {
      console.log("# Metadata Is Loaded");
      console.log("## Info");
      console.log(JSON.stringify(data.info, null, 2));
      console.log();
      if (data.metadata) {
        console.log("## Metadata");
        console.log(JSON.stringify(data.metadata.getAll(), null, 2));
        console.log();
      }
    });

    const loadPage = function (pageNum) {
      return doc.getPage(pageNum).then(function (page) {
        console.log("# Page " + pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        console.log("Size: " + viewport.width + "x" + viewport.height);
        console.log();
        return page
          .getTextContent()
          .then(function (content) {
            // Content contains lots of information about the text layout and
            // styles, but we need only strings at the moment
            const strings = content.items.map(function (item) {
              return item.str;
            });
            console.log("## Text Content");
            console.log(strings.join(" "));
            // Release page resources.
            page.cleanup();
          })
          .then(function () {
            console.log();
          });
      });
    };
    // Loading of the first page will wait on metadata and subsequent loadings
    // will wait on the previous pages.
    for (let i = 1; i <= numPages; i++) {
      lastPromise = lastPromise.then(loadPage.bind(null, i));
    }
    return lastPromise;
  })
  .then(
    function () {
      console.log("# End of Document");
    },
    function (err) {
      console.error("Error: " + err);
    }
  );
  */