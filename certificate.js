const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyyxH8s3Zoqb6-L9O7SRv4CzKZtz2HFV0pD5QWgL7t0K-bAw-lY4GI8N60QCDjlsxMblw/exec'

const certificateCollection = [
]

let pageUrl;
let isGuestUser;

let bodyHtmlElement;
let completeButtonHtmlElement;

let isCollectionVideoPage = false;

function addMarkAsCompleteButton() {
    if (!pageUrl.includes('/programs') ||
        document.querySelector('.collection-videos')) return;

    if (pageUrl.includes('/programs/') && document.querySelector('.collection-lable'))
        isCollectionVideoPage = true;

    let contentHtmlElement = document.querySelector('.editor-content')
    if (!contentHtmlElement) return;

    let pageContainerHtmlElement = document.querySelector('.page .container')
    markAsWatchedHtmlElement = document.querySelector('#program_buttons_video_watched button')

    let videowWatchedTickHtmlElement = document.querySelector('#program_playlist .bg-gray-300 [data-area="watched-icon"]')
    if (!videowWatchedTickHtmlElement)
        videowWatchedTickHtmlElement = document.querySelector('[data-area="chapters"] .bg-gray-300 [data-area="watched-icon"]').parentNode

    if (!videowWatchedTickHtmlElement) return;

    let isVisisble = window.getComputedStyle(videowWatchedTickHtmlElement, null).display != 'none';
    console.log(window.getComputedStyle(videowWatchedTickHtmlElement, null).display, { isVisisble })


    let getButtonHtml = (className) => {
        return (`
            <div class="complete_button ${className}">
                <div class="complete_button_wrapper">
                    <div class="content">
                    </div>
                </div>
            </div>
        `)
    }

    // pageContainerHtmlElement.insertAdjacentHTML('beforeend', getButtonHtml('complete_button_full'))
    let programAboutHtmlElement = document.querySelector('#program_about');
    let descriptionWWrapperHtmlElement = programAboutHtmlElement.parentNode;
    programAboutHtmlElement.nextElementSibling.style.display = 'none'
    descriptionWWrapperHtmlElement.insertAdjacentHTML('beforeend', getButtonHtml('complete_button_small'))

    completeButtonHtmlElement = document.querySelector('.complete_button');

    if (isVisisble) setButtonComplete()
    else setButtonIncomplete()

    document.querySelector('#more_actions_btn[aria-haspopup]').style.display = 'none';
    addMarkAsCompleteButtonListener();
}

function addMarkAsCompleteButtonListener() {
    if (!completeButtonHtmlElement) return;

    let isPlaylist = document.querySelector('#program_playlist')

    completeButtonHtmlElement.onclick = (event) => {
        let watchedIconLength;
        let watchedIconCount = 0;

        if (isCollectionVideoPage) {
            let watchedIconHtmlElement = document.querySelectorAll('div[data-area="chapters"] svg[data-area="watched-icon"]')
            watchedIconLength = watchedIconHtmlElement.length;

            watchedIconHtmlElement.forEach(htmlElement => {
                if (isPlaylist) {
                    if (window.getComputedStyle(htmlElement).display === 'block') watchedIconCount++
                } else {
                    if (window.getComputedStyle(htmlElement.parentNode).display === 'block') watchedIconCount++
                }
            })
        }

        if (completeButtonHtmlElement.classList.contains('complete_button_selected')) {
            setButtonIncomplete()
        } else {
            setButtonComplete()

            let collection = document.querySelector('.collection-title').innerHTML.trim()

            if (certificateCollection.length === 0 || (certificateCollection.length > 0 && certificateCollection.includes(collection))) {
                if (watchedIconCount + 1 === watchedIconLength) {
                    sendDataToGoogleSheet({
                        email: bodyHtmlElement.getAttribute('user-email'),
                        name: bodyHtmlElement.getAttribute('user-name'),
                        collection,
                    })
                }
            }
        }

        let markAsWatchedHtmlElement = document.querySelector('#program_buttons_video_watched button');
        markAsWatchedHtmlElement.click();
        setTimeout(() => {
            addCollectionNextVideoListener();
        }, 1000)
    }
}

function addCollectionNextVideoListener() {
    let watchedIconHtmlElement = document.querySelectorAll('div[data-area="chapters"] svg[data-area="watched-icon"]')

    let playlistItemHtmlElement = document.querySelectorAll('[data-area="chapters"] div[data-controller="playlist-item"]')
    playlistItemHtmlElement.forEach((htmlElement, index) => {
        htmlElement.onclick = (event) => {
            console.log('clickkkk', window.getComputedStyle(watchedIconHtmlElement[index].parentNode).display)
            let watched = window.getComputedStyle(watchedIconHtmlElement[index].parentNode).display === 'block'

            if (watched) setButtonComplete()
            else setButtonIncomplete()
        }
    })
}

function setButtonComplete() {
    completeButtonHtmlElement.classList.add('complete_button_selected')
    completeButtonHtmlElement.querySelector('.content').textContent = 'Mark as Incomplete'
}

function setButtonIncomplete() {
    completeButtonHtmlElement.classList.remove('complete_button_selected')
    completeButtonHtmlElement.querySelector('.content').textContent = 'Mark as Complete'
}

function sendDataToGoogleSheet(data) {
    const dataToSend = {
        email: data.email,
        name: data.name,
        collection: data.collection,
    };

    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        redirect: "follow",
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(dataToSend),
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }).then((data) => {
        console.log('Data sent successfully:', data);
    }).catch((error) => {
        console.error('Error sending data:', error);
    });
}


window.onload = setTimeout(() => {
    pageUrl = window.location.href
    bodyHtmlElement = document.querySelector('body');

    let isGuestUser = bodyHtmlElement.getAttribute('user-guest')
    if (isGuestUser === 'true') return;

    addMarkAsCompleteButton();
    addCollectionNextVideoListener();
}, 2000);