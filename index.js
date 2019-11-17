const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');

const PORT = process.env.PORT || 5000;

const app = express();

const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200, 
}

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.listen(PORT, () => {
    console.log("Listening on port " + PORT);
});

app.post('/',async (req, res) => {

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Starts to gather coverage information for JS and CSS files
  await Promise.all([page.coverage.startJSCoverage(), page.coverage.startCSSCoverage()]);

  await page.goto(''+req.body.url);
  await page.waitForSelector('title');

  // Stops the coverage gathering
  const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
  ]);

  // Calculates how many bytes are being used based on the coverage
  const calculateUsedBytes = (type, coverage) =>
    coverage.map(({ url, ranges, text }) => {
      let usedBytes = 0;

      ranges.forEach(range => (usedBytes += range.end - range.start - 1));

      return {
        url,
        type,
        usedBytes,
        totalBytes: text.length
      };
    });

  await browser.close();

  res.status(200).send([
    ...calculateUsedBytes('js', jsCoverage),
    ...calculateUsedBytes('css', cssCoverage)
  ]);

})