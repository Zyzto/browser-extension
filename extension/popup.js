/*
Loaded into popup index.html
*/

'use strict';

let browserType = getBrowser();

// boilerplate to dedect browser type api
function getBrowser() {
  if (typeof chrome !== 'undefined') {
    if (typeof browser !== 'undefined') {
      return browser;
    } else {
      return chrome;
    }
  } else {
    console.log('failed to dedect browser');
    throw 'browser detection error';
  }
}

// store access details
document.getElementById('save-login').addEventListener('click', function () {
  let url = document.getElementById('full-url').value;
  if (!url.includes('://')) {
    url = 'http://' + url;
  }
  let parsed = new URL(url);
  let toStore = {
    access: {
      url: `${parsed.protocol}//${parsed.hostname}`,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      apiKey: document.getElementById('api-key').value,
    },
  };
  browserType.storage.local.set(toStore, function () {
    console.log('Stored connection details: ' + JSON.stringify(toStore));
    pingBackend();
  });
});

// verify connection status
document.getElementById('status-icon').addEventListener('click', function () {
  pingBackend();
});

// send cookie
document.getElementById('sendCookies').addEventListener('click', function () {
  sendCookie();
});

function sendCookie() {
  console.log('popup send cookie');

  function handleResponse(message) {
    console.log('handle cookie response: ' + JSON.stringify(message));
    let cookie_validated = message.cookie_validated;
    document.getElementById('sendCookiesStatus').innerText = 'validated: ' + cookie_validated;
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }

  let checked = document.getElementById('sendCookies').checked;
  let toStore = {
    sendCookies: {
      checked: checked,
    },
  };
  browserType.storage.local.set(toStore, function () {
    console.log('stored option: ' + JSON.stringify(toStore));
  });
  if (checked === false) {
    return;
  }
  let sending = browserType.runtime.sendMessage({ sendCookie: true });
  sending.then(handleResponse, handleError);
}

// send ping message to TA backend
function pingBackend() {
  function handleResponse(message) {
    if (message.response === 'pong') {
      setStatusIcon(true);
      console.log('connection validated');
    }
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
    setStatusIcon(false);
  }

  console.log('ping TA server');
  let sending = browserType.runtime.sendMessage({ verify: true });
  sending.then(handleResponse, handleError);
}

// add url to image
function addUrl(access) {
  const url = `${access.url}:${access.port}`;
  document.getElementById('ta-url').setAttribute('href', url);
}

function setCookieState() {
  function handleResponse(message) {
    console.log(message);
    document.getElementById('sendCookies').checked = message.cookie_enabled;
    if (message.validated_str) {
      document.getElementById('sendCookiesStatus').innerText = message.validated_str;
    }
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }

  console.log('set cookie state');
  let sending = browserType.runtime.sendMessage({ cookieState: true });
  sending.then(handleResponse, handleError);
  document.getElementById('sendCookies').checked = true;
}

// change status icon based on connection status
function setStatusIcon(connected) {
  let statusIcon = document.getElementById('status-icon');
  if (connected) {
    statusIcon.innerHTML = '&#9745;';
    statusIcon.style.color = 'green';
  } else {
    statusIcon.innerHTML = '&#9746;';
    statusIcon.style.color = 'red';
  }
}

// fill in form
document.addEventListener('DOMContentLoaded', async () => {
  function onGot(item) {
    if (!item.access) {
      console.log('no access details found');
      setStatusIcon(false);
      return;
    }
    let { url, port } = item.access;
    let fullUrl = url;
    if (!(url.startsWith('http://') && port === '80')) {
      fullUrl += `:${port}`;
    }
    document.getElementById('full-url').value = fullUrl;
    document.getElementById('api-key').value = item.access.apiKey;
    pingBackend();
    addUrl(item.access);
  }

  function setCookiesOptions(result) {
    if (!result.sendCookies || result.sendCookies.checked === false) {
      console.log('sync cookies not set');
      return;
    }
    console.log('set options: ' + JSON.stringify(result));
    setCookieState();
  }

  browserType.storage.local.get('access', function (result) {
    onGot(result);
  });

  browserType.storage.local.get('sendCookies', function (result) {
    setCookiesOptions(result);
  });
});
