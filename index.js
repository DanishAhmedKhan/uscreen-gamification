const BMS_AUTH_TOKEN = 'bms_auth_token'
// const BACKEND_API_URL = 'https://dev.uscreenexpert.com/api'
const BACKEND_API_URL = 'http://localhost:4400/api'

let pageUrl;
let isGuestUser;
let userAuthToken;

let point;
let badgeUrl;

let userData = {
    point: 0,
    badge: [],
}

let bodyHtmlElement;
let completeButtonHtmlElement;
let pointPopupHtmlElement;
let markAsWatchedHtmlElement;
let markAsCompleteHtmlElement;
let badgeContainerHtmlElement;
let headerPointHtmlElement;
let celebrationBoxHtmlElement;

let isCollectionVideoPage = false;

let pointPopupSetTnterval;

const celebrations = {
    ester_egg: {
        url: 'https://lottie.host/d666d043-cdb9-4123-9e83-5798ef40089d/TFVZjoFIkc.json'
    },
}
let celebrationList = []

function animateNumber(htmlElement, startValue, endValue, duration, interval = 50) {
    const steps = (duration / interval);
    const stepSize = (endValue - startValue) / steps;
    let currentValue = startValue;
    let currentStep = 0;

    const updateNumber = () => {
        currentValue += stepSize;
        currentStep++;

        if (currentStep >= steps) {
            currentValue = endValue;
            clearInterval(animationInterval);
        }

        htmlElement.textContent = Math.round(currentValue);
    };

    const animationInterval = setInterval(updateNumber, interval);
}

function getUserId() {
    let userId = bodyHtmlElement.getAttribute('user-id');
    let productId = bodyHtmlElement.getAttribute('storefront-url');

    return {
        platform: 'Uscreen',
        userId,
        productId,
    }
}

function getHeader() {
    let header = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
    if (userAuthToken) header['x-auth-token'] = userAuthToken

    return header
}

async function fetchApi(api, data, callback) {
    let fetchOption = {
        method: 'POST',
        headers: getHeader(),
    }
    if (data) fetchOption.body = JSON.stringify(data);

    let response;
    try {
        response = await fetch(BACKEND_API_URL + api, fetchOption);
        response = await response.json();

        if (callback && response.code == 200) {
            callback(response);
        }
    } catch (error) {
        console.log(response)
        console.log(error)
    }
}

async function addUser() {
    console.log('user', getUserId())
    await fetchApi('/addUser', getUserId(), (response) => {
        authToken = response.data['x-auth-token'];
        localStorage.setItem(BMS_AUTH_TOKEN, authToken);
    })
}

async function getUserData() {
    await fetchApi('/getData', null, (response) => {
        userData = response.data.data;
    })
}

async function setUserData() {
    await fetchApi('/addData', { data: userData })
}

async function getLeaderboard() {
    await fetchApi('/getLeaderboard', { productId: bodyHtmlElement.getAttribute('storefront-url') }, (response) => {
        console.log({ response })
    })
}

function addMarkAsCompleteButton() {
    if (!pageUrl.includes('/programs') ||
        document.querySelector('.collection-videos')) return;

    let contentHtmlElement = document.querySelector('.editor-content')
    if (!contentHtmlElement) return;

    let pageContainerHtmlElement = document.querySelector('.page .container')
    markAsWatchedHtmlElement = document.querySelector('#program_buttons_video_watched button')

    let contentChildrenHtmlElement = Array.from(contentHtmlElement.children)

    let isPointMystery = false;

    contentChildrenHtmlElement.forEach(htmlElement => {
        let textContent = htmlElement.textContent.trim()
        let textLength = textContent.length;

        if (textContent.charAt(0) == '[' &&
            textContent.charAt(textContent.length - 1) == ']') {
            let index = textContent.indexOf('=');

            let dataType = textContent.substring(1, index).trim();
            let dataValue = textContent.substring(index + 1, textLength - 1);

            if (dataType === 'point') {
                if (dataValue.includes('?')) {
                    point = dataValue.replace('?', '')
                    isPointMystery = true;
                } else {
                    point = dataValue;
                }

                if (!isNaN(point)) {
                    point = Number(point)
                }
            }

            htmlElement.remove();
        }
    })

    let pointHtml = !point || point == 0 ? '' : `
      <div class="point_wrapper">
        <div class="point_value">${isPointMystery ? '??' : point}</div>
        <div class="point_xp_text">XP</div>
      </div>
    `;

    pageContainerHtmlElement.insertAdjacentHTML('beforeend', `
        <div class="complete_button">
            <div class="complete_button_wrapper">
                <div class="checkmark">
                    <div class="checkmark_wrapper">
                        <div class="logo">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" 
                            fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/>
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        </div>
                    </div>
                </div>
                <div class="content">
                    Mark as complete
                </div>
                <div class="point">${pointHtml}</div>
            </div>
        </div>
    `)

    document.querySelector('#more_actions_btn[aria-haspopup]').style.display = 'none';

    addMarkAsCompleteButtonListener();
}

function addHeaderPoint() {
    let navigationHtmlElement = document.querySelector('body > header > div > nav > ul > li.header--menu-account')
    navigationHtmlElement.insertAdjacentHTML('beforebegin', `
        <div class="header_point" style="display:none;">
            <div class="point_value"></div>
            <div class="point_xp_text">XP</div>
        </div>
    `)
    headerPointHtmlElement = document.querySelector('.header_point');
}

function addMarkAsCompleteButtonListener() {
    completeButtonHtmlElement = document.querySelector('.complete_button');
    if (!completeButtonHtmlElement) return;

    completeButtonHtmlElement.onclick = (event) => {
        if (!userData.point) userData.point = 0;
        if (!userData.badge) userData.badge = [];
        let startPoint = Number(userData.point);

        let watchedIconLength;
        let watchedIconCount = 0;

        if (isCollectionVideoPage) {
            let watchedIconHtmlElement = document.querySelectorAll('#program_playlist > div > div[data-area="chapters"] svg[data-area="watched-icon"]')
            watchedIconLength = watchedIconHtmlElement.length;

            watchedIconHtmlElement.forEach(htmlElement => {
                if (window.getComputedStyle(htmlElement).display === 'block') watchedIconCount++
            })
        }

        if (completeButtonHtmlElement.classList.contains('complete_button_selected')) {
            setButtonIncomplete();

            userData.point = userData.point - point;
            if (badgeUrl) {
                userData.badge = userData.badge.filter(badge => badge !== badgeUrl);
            }
        } else {
            setButtonComplete();
            playCoinAudio();

            userData.point = userData.point + point;
            console.log(badgeUrl)
            console.log(watchedIconCount, watchedIconLength)
            if (badgeUrl && watchedIconCount + 1 === watchedIconLength) {
                console.log('badge')
                userData.badge.push(badgeUrl)

                sendDataToGoogleSheet({
                    email: bodyHtmlElement.getAttribute('user-email'),
                    name: bodyHtmlElement.getAttribute('user-name'),
                })
            }

            showPointCelebration()
        }

        let markAsWatchedHtmlElement = document.querySelector('#program_buttons_video_watched button');
        markAsWatchedHtmlElement.click();
        setTimeout(() => {
            addCollectionNextVideoListener();
        }, 1000)

        if (userData.point < 0) userData.point = 0;
        let endPoint = userData.point;

        setUserData(userData);

        let duration = 300;
        if (point >= 5) duration = 500
        animateNumber(pointPopupHtmlElement.querySelector('.point_value'), startPoint, endPoint, duration, 50)
        pointPopupHtmlElement.classList.add('point_popup_visible');

        if (pointPopupSetTnterval) clearInterval(pointPopupSetTnterval)
        pointPopupSetTnterval = setTimeout(() => {
            pointPopupHtmlElement.classList.remove('point_popup_visible')
        }, 3000)
    }
}

function showPointCelebration() {
    if (point > 0) {
        showCelebrationSvg('ester_egg')
    }
}

function addPointPopup() {
    bodyHtmlElement.insertAdjacentHTML('beforeend', `
        <div class="point_popup">
            <div class="point_popup_wrapper">
                <div class="point_popup_container">
                    <div class="content">
                        <div class="heading">
                            Points you have collected 👉
                        </div>
                        <div class="text">
                            Complete the next lesson to earn more points and appear on the 
                            leaderboard.
                        </div>
                    </div>
                    <div class="point">
                        <div class="point_text">
                            TOTAL XP POINTS
                        </div>
                        <div class="point_value_wrapper">
                            <div class="point_value"></div>
                            <div class="point_xp_text">XP</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `)

    pointPopupHtmlElement = document.querySelector('.point_popup');

    let successFlagHtmlElement = document.querySelector('#program_buttons_video_watched_form .text-ds-success-fg')
    if (successFlagHtmlElement) setButtonComplete()
}

function playCoinAudio() {
    const audioUrl = 'https://res.cloudinary.com/dp0kx2htu/video/upload/v1691750346/coin-sound_meec6q.webm';
    const audioElement = document.createElement("audio");
    audioElement.src = audioUrl;
    audioElement.volume = 0.1;
    audioElement.play();
}

function setButtonComplete() {
    completeButtonHtmlElement.classList.add('complete_button_selected');
    completeButtonHtmlElement.querySelector('.logo').style.display = 'block';
    completeButtonHtmlElement.querySelector('.content').textContent = 'Complete'
}

function setButtonIncomplete() {
    completeButtonHtmlElement.classList.remove('complete_button_selected');
    completeButtonHtmlElement.querySelector('.logo').style.display = 'none';
    completeButtonHtmlElement.querySelector('.content').textContent = 'Mark as complete'
}

function addBagdeContainer() {
    if (!pageUrl.includes('/catalog')) return;

    let catalogFiltersHtmlElement = document.querySelector('#catalog_filters');
    catalogFiltersHtmlElement.insertAdjacentHTML('beforebegin', `
        <div class="badge_container">
            <div class="badge_wrapper">
                <div class="loader">
                    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
                </div> 
                <div class="no_badge_text">No badges collected. Complete lessons to collect badges.</div>
                <div class="badge_list"></div>
            </div>
        </div>
    `)

    badgeContainerHtmlElement = document.querySelector('.badge_container')
}

async function addBadgeToList() {
    if (!badgeContainerHtmlElement) return;

    let getBadgeItemHtml = (url) => {
        return (`
            <div class="badge badge_item">
                <div class="badge_item_wrapper">
                    <div class="badge_image">
                        <img src="${url}">
                    </div>
                    <div class="badge_title"></div>
                </div>
            </div>
        `)
    }

    let badgeHtml = userData.badge.reduce((acc, badge) => {
        return acc += getBadgeItemHtml(badge)
    }, '')

    let collectionCount = await getCollectionCount()
    console.log(collectionCount)
    let lockedBadgeUrl = 'https://res.cloudinary.com/dp0kx2htu/image/upload/v1694939317/locked_badge_jaxrb7.jpg'

    for (let i = 0; i < collectionCount - userData.badge.length; i++) {
        badgeHtml += getBadgeItemHtml(lockedBadgeUrl)
    }

    let loaderHtmlElement = badgeContainerHtmlElement.querySelector('.loader');
    let noBadgeTextHtmlElement = badgeContainerHtmlElement.querySelector('.no_badge_text')
    let badgeListHtmlElement = badgeContainerHtmlElement.querySelector('.badge_list')

    loaderHtmlElement.style.display = 'none';

    badgeListHtmlElement.style.display = 'block';
    badgeListHtmlElement.innerHTML = badgeHtml;
    $(badgeListHtmlElement).slick({
        slidesToShow: 5, // Number of slides to show at a time
        slidesToScroll: 1, // Number of slides to scroll at a time
        infinite: true, // Loop the slides
        prevArrow: `
                <button class="slick-prev slide-nav">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>
                </button>`,
        nextArrow: `
                <button class="slick-next slide-nav">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
                </button>`,
    })
}

function addPointToPage() {
    headerPointHtmlElement.querySelector('.point_value').innerHTML = userData.point;
    headerPointHtmlElement.style.display = 'flex';
}

async function getCollectionBadge() {
    if (!pageUrl.includes('/programs/collection')) return;
    isCollectionVideoPage = true;

    let index = pageUrl.indexOf('?');
    if (index < 0) return;

    let collectionPageUrl = pageUrl.substring(0, index);
    collectionPageUrl += '.turbo_stream?playlist_position=sidebar&preview=false';

    try {
        const result = await fetch(collectionPageUrl);
        const response = await result.text()

        let i1 = response.indexOf('editor-content');
        if (i1 < 0) return;
        let i2 = response.indexOf('>', i1)
        let i3 = response.indexOf('</div>', i1)
        let description = response.substring(i2 + 1, i3)

        i1 = description.indexOf('[ badge=')
        if (i1 < 0) return;
        i2 = description.indexOf('=', i1)
        i3 = description.indexOf(']', i1)

        badgeUrl = description.substring(i2 + 1, i3).trim();
    } catch (error) {
        console.log(error);
    }
}

function addCollectionNextVideoListener() {
    let watchedIconHtmlElement = document.querySelectorAll('#program_playlist > div > div[data-area="chapters"] svg[data-area="watched-icon"]')

    let playlistItemHtmlElement = document.querySelectorAll('#program_playlist div[data-controller="playlist-item"]')
    playlistItemHtmlElement.forEach((htmlElement, index) => {
        htmlElement.onclick = (event) => {
            let watched = window.getComputedStyle(watchedIconHtmlElement[index]).display === 'block'

            if (watched) setButtonComplete()
            else setButtonIncomplete()
        }
    })
}

function addCelebrationBox() {
    bodyHtmlElement.insertAdjacentHTML('beforeend', `
        <div class="celebration_box" style="display:none;">
        </div>
    `)

    celebrationBoxHtmlElement = document.querySelector('.celebration_box')
}

function showCelebrationSvg(celebrationName) {
    let celebration = celebrations[celebrationName]

    let animation;
    loadJSON(celebration.url, function (animationData) {
        animation = lottie.loadAnimation({
            container: celebrationBoxHtmlElement,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: animationData,
        });

        celebrationBoxHtmlElement.style.display = 'block';
        animation.play();
        const animationDuration = animation.totalFrames / animation.frameRate * 1000;

        setTimeout(() => {
            celebrationBoxHtmlElement.innerHTML = ''
            celebrationBoxHtmlElement.style.display = 'none'
        }, animationDuration)
    });

}

function loadUserData(callback) {
    userAuthToken = localStorage.getItem(BMS_AUTH_TOKEN);

    let promise = new Promise(async (resolve, reject) => {
        if (userAuthToken) {
            await getUserData();
        } else {
            await addUser();
        }
        resolve();
    })

    promise.then(callback)
}

function addClearFilterListener() {
    let mainFilterHtmlElement = document.querySelector('.main-filters');
    if (!mainFilterHtmlElement) return

    const clearFilterListerner = () => {
        setTimeout(() => {
            initAll();
        }, 3000);
    }

    let clearFilterHtmlElement = mainFilterHtmlElement.querySelector('#catalog_filter_button')
    if (clearFilterHtmlElement.textContent.trim().toLowerCase() === 'clear filters') {
        clearFilterHtmlElement.onclick = clearFilterListerner;
    }

    function handleButtonInsertion(mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                for (let node of addedNodes) {
                    if (node.nodeName === 'BUTTON') {
                        node.onclick = clearFilterListerner;
                    }
                }
            }
        }
    }

    const config = { childList: true, subtree: true };
    const observer = new MutationObserver(handleButtonInsertion);
    observer.observe(mainFilterHtmlElement, config);
}

async function getCollectionCount() {
    // https://api-u-alpha.global.ssl.fastly.net/catalog/search.turbo_stream?action=search&amp;controller=storefront%2Fcatalogs
    // let url = 'https://danishswebsite-d2b6.uscreen.io/catalog/search.turbo_stream?action=search&amp;controller=storefront%2Fcatalogs'
    let url = 'https://danishswebsite-d8c0.uscreen.io/catalog/search.turbo_stream?action=search&amp;controller=storefront%2Fcatalogs'
    let result = await fetch(url)
    result = await result.text()
    let divHtmlElement = document.createElement('div')
    divHtmlElement.innerHTML = result
    let html = divHtmlElement.querySelector('[action="append"]').innerHTML
    let collectionCount = (html.match(/data-card="collection_/g)).length

    return collectionCount
}

function sendDataToGoogleSheet(data) {
    const dataToSend = {
        email: data.email,
        name: data.name,
    };

    fetch('https://script.google.com/macros/s/AKfycbyhmqaMLil2kjO2s34YgUEE5MaxSMQb5Ysfb1NA1kkPCAhx-UfC-MhA0X6u1EY--L1XSg/exec', {
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

function beforeDataLoad() {
    addMarkAsCompleteButton();
    addHeaderPoint();
    addPointPopup();
    addBagdeContainer();
    getCollectionBadge();
    addCollectionNextVideoListener();
    addCelebrationBox();
    addClearFilterListener();
}

function afterDataLoad() {
    addPointToPage();
    addBadgeToList();
    getLeaderboard();
}

function initAll() {
    beforeDataLoad();
    afterDataLoad();
}

function loadJSON(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(JSON.parse(xhr.responseText));
        }
    };
    xhr.send(null);
}

window.onload = setTimeout(() => {
    pageUrl = window.location.href
    bodyHtmlElement = document.querySelector('body');

    let isGuestUser = bodyHtmlElement.getAttribute('user-guest')
    if (isGuestUser === 'true') return;

    beforeDataLoad()

    loadUserData(() => {
        afterDataLoad()
    });
}, 2000);