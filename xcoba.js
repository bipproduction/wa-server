// Your input text
const inputText = "https://example.com";
const regex = /^(?!https:\/\/).+/;

if (regex.test(inputText)) {
  console.log("Text does not start with 'https://'");
} else {
  console.log("Text starts with 'https://'");
}
