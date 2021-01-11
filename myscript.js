document.addEventListener('DOMContentLoaded', app)

let video
let index
let videosArchive = [
    {
        "src": "media/video1.mp4",
        "title": "Rickrolling"
    },
    {
        "src": "media/video2.mp4",
        "title": "Epic Sax LOTR Edition"
    },
    {
        "src": "media/video3.mp4",
        "title": "Breathtaking Keanu being breathtaking"
    },
    {
        "src": "media/video4.mp4",
        "title": "Wide Putin"
    },]
let videoPreview
let currentFrameSec
let showPreview = false

let mx = 0, my = 0
let canvas, context, W, H
let currentFilter

let botBarHeight
let botBarSidePadding
let progressBarHeight
let spaceBetweenButtons
let buttonW
let buttonH
let prevBtnFinished
let playPauseBtnFinished
let nextButtonFinished
let volumeUpButtonFinished
let contextMenuFilters
let contextMenuPlaylist

let subtitlesURL = "media/subtitles.json"
let subtitlesData
let currentSubtitles

async function app() {
    //Preparing subtitles:
    let response = await fetch(subtitlesURL)
    subtitlesData = await response.json()

    //Initialise video and videoPreview:
    video = document.createElement('video')
    index = 0
    video.src = videosArchive[index]['src']
    setCurrentTitle()
    video.load()
    video.volume = 0.5
    getCurrentSubtitle()

    videoPreview = document.createElement('video')
    videoPreview.src = video.src
    videoPreview.load()

    //Preparing canvas:
    canvas = document.querySelector('canvas')
    context = canvas.getContext('2d')
    W = canvas.width
    H = canvas.height

    //EventHandlers:
    canvas.addEventListener('mousemove', e => {
        mx = e.x - canvas.getBoundingClientRect().x
        my = e.y - canvas.getBoundingClientRect().y
        if (mx > botBarSidePadding && mx < W - botBarSidePadding && my > H - botBarHeight && my < H - botBarHeight + progressBarHeight) {
            currentFrameSec = Math.round(mx * video.duration / W)
            videoPreview.currentTime = currentFrameSec
            showPreview = true
        } else {
            showPreview = false
        }
    })

    canvas.addEventListener('click', () => {
        //Select moment based on progressBar click:
        if (mx > botBarSidePadding && mx < W - botBarSidePadding && my > H - botBarHeight && my < H - botBarHeight + progressBarHeight) {
            video.currentTime = mx * video.duration / W
            localStorage.setItem("videoTime", video.currentTime)
            return
        }

        //Buttons' EventHandlers:
        // - Previous
        if (mx > botBarSidePadding && mx < prevBtnFinished - spaceBetweenButtons && my < H - buttonH && my > H - 2 * buttonH) {
            prevVideo()
            return
        }
        // - Next
        if (mx > playPauseBtnFinished && mx < nextButtonFinished - spaceBetweenButtons && my < H - buttonH && my > H - 2 * buttonH) {
            nextVideo()
            return
        }
        // - VolumeUp
        if (mx > W - botBarSidePadding - buttonW && mx < W - botBarSidePadding && my < H - buttonH && my > H - 2 * buttonH) {
            if (video.volume + 0.10 > 1) {
                video.volume = 1
                console.log("MAX VOLUME")
                return
            }
            video.volume += 0.10
            localStorage.setItem("volume", video.volume)
            return
        }
        // - VolumeDown
        if (mx > volumeUpButtonFinished && mx < volumeUpButtonFinished + buttonW && my < H - buttonH && my > H - 2 * buttonH) {
            if (video.volume - 0.10 < 0) {
                video.volume = 0
                console.log("MIN VOLUME")
                return
            }
            video.volume -= 0.10
            localStorage.setItem("volume", video.volume)
            return
        }

        if (video.paused) {
            video.play()
        } else {
            video.pause()
            localStorage.setItem("videoTime", video.currentTime)
        }
    })

    // - ContextMenu
    contextMenuFilters = document.querySelector('.contextMenuFilters')
    contextMenuFilters.style.display = "none"
    currentFilter = 0

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault()
        contextMenuFilters.style.display = "block"
        contextMenuFilters.style.top = e.clientY + "px"
        contextMenuFilters.style.left = e.clientX + "px"
    })

    contextMenuPlaylist = document.querySelector('.contextMenuPlaylist')
    contextMenuPlaylist.style.display = 'none'

    createPlaylist()

    // -> to make the ContextMenu disappear
    document.body.addEventListener('click', () => {
        if (contextMenuFilters.style.display === "block") {
            contextMenuFilters.style.display = "none"
        }
        if (contextMenuPlaylist.style.display === "block") {
            contextMenuPlaylist.style.display = "none"
        }
    })

    if (localStorage.length > 0) {
        loadLocalStorage()
    } else {
        localStorage.setItem("volume", video.volume)
    }

    drawVideoFrame()

    addNewVideo()
}

function setCurrentTitle() {
    let currentTitle = document.querySelector("#currentTitle")
    currentTitle.innerText = videosArchive[index]['title']
}

function getCurrentSubtitle() {
    if (localStorage.getItem("isIndexValid") === "true") {
        for (let videoSubtitle of subtitlesData) {
            if (videoSubtitle['videoName'] === videosArchive[index]['src']) {
                currentSubtitles = videoSubtitle['subtitle']
                break
            } else {
                currentSubtitles = null
            }
        }
    } else {
        currentSubtitles = null
    }
}

function createPlaylist() {
    let playlist = document.querySelector('ul')
    playlist.innerHTML = ''
    for (let i = 0; i < videosArchive.length; i++) {
        let li = document.createElement('li')
        li.innerText = videosArchive[i]['title']
        playlist.append(li)
        li.addEventListener('click', () => {
            index = i
            setCurrentVideo()
        })
        li.addEventListener('contextmenu', e => {
            e.preventDefault()
            index = i
            contextMenuPlaylist.style.display = "block"
            contextMenuPlaylist.style.top = e.clientY + "px"
            contextMenuPlaylist.style.left = e.clientX + "px"
        })
    }
}

function loadLocalStorage() {
    if (localStorage.getItem("isIndexValid") === "true") {
        index = parseInt(localStorage.getItem("index"))
        localStorage.setItem("firstSession", "true")
        video.currentTime = localStorage.getItem("videoTime")
        setCurrentVideo()
    } else {
        localStorage.setItem("index", index)
        localStorage.setItem("isIndexValid", "true")
    }
    video.volume = localStorage.getItem("volume")
    currentFilter = parseInt(localStorage.getItem("filter"))
    localStorage.setItem("firstSession", "false")
}

function drawVideoFrame() {

    context.drawImage(video, 0, 0, W, H)

    //Filters:
    applyFilter()

    //BottomBar:
    botBarHeight = 50
    botBarSidePadding = 15
    context.fillStyle = "rgba(255,255,255,0)"
    context.fillRect(botBarSidePadding, H - botBarHeight, W - 2 * botBarSidePadding, botBarHeight)
    // - ProgressBar
    progressBarHeight = 10

    context.fillStyle = 'rgba(255,255,255,0)'
    context.strokeStyle = 'rgba(255,255,255,0.2)'
    context.fillRect(botBarSidePadding, H - botBarHeight, W - 2 * botBarSidePadding, progressBarHeight)
    context.strokeRect(botBarSidePadding, H - botBarHeight, W - 2 * botBarSidePadding, progressBarHeight)

    let currentSec = video.duration ? video.currentTime / video.duration : 0

    context.fillStyle = 'rgba(205,0,0,0.8)'
    context.fillRect(botBarSidePadding, H - botBarHeight, currentSec * (W - 2 * botBarSidePadding), progressBarHeight)
    context.strokeRect(botBarSidePadding, H - botBarHeight, W - 2 * botBarSidePadding, progressBarHeight)

    // - Subtitles
    if (currentSubtitles !== null) {
        for (let currentPhrase of currentSubtitles) {
            if (video.currentTime > currentPhrase['start'] && video.currentTime < currentPhrase['end']) {
                context.fillStyle = 'white'
                context.fillStroke = 'black'
                context.font = '20px Comic Sans MS'
                context.textAlign = 'center'
                context.textBaseline = 'middle'
                context.fillText(currentPhrase['text'], W / 2, H - botBarHeight - 2 * progressBarHeight)
            }
        }
    }

    // - Buttons:
    spaceBetweenButtons = 10
    buttonW = botBarSidePadding
    buttonH = (botBarHeight - progressBarHeight) / 3
    context.fillStyle = 'rgba(205,0,0,0.7)'
    context.lineWidth = 1

    // -> Previous Button
    context.beginPath()
    context.fillRect(botBarSidePadding, H - 2 * buttonH, buttonW / 3, buttonH)
    context.moveTo(botBarSidePadding + buttonW / 3, H - 3 * buttonH / 2)
    context.lineTo(2 * buttonW, H - buttonH)
    context.moveTo(botBarSidePadding + buttonW / 3, H - 3 * buttonH / 2)
    context.lineTo(2 * buttonW, H - 2 * buttonH)
    context.lineTo(2 * buttonW, H - buttonH)
    context.fill()
    context.closePath()
    prevBtnFinished = 2 * buttonW + spaceBetweenButtons

    // -> Play/Pause Button
    if (video.paused) {
        context.beginPath()
        context.moveTo(prevBtnFinished + buttonW, H - 3 * buttonH / 2)
        context.lineTo(prevBtnFinished, H - buttonH)
        context.moveTo(prevBtnFinished + buttonW, H - 3 * buttonH / 2)
        context.lineTo(prevBtnFinished, H - buttonH)
        context.lineTo(prevBtnFinished, H - 2 * buttonH)
        context.fill()
    } else {
        context.beginPath()
        context.fillRect(prevBtnFinished, H - 2 * buttonH, buttonW / 3, buttonH)
        context.fillRect(prevBtnFinished + 2 * buttonW / 3, H - 2 * buttonH, buttonW / 3, buttonH)
    }
    playPauseBtnFinished = prevBtnFinished + buttonW + spaceBetweenButtons

    // -> Next Button
    context.beginPath()
    context.moveTo(playPauseBtnFinished + 2 * buttonW / 3, H - 3 * buttonH / 2)
    context.lineTo(playPauseBtnFinished, H - buttonH)
    context.moveTo(playPauseBtnFinished + 2 * buttonW / 3, H - 3 * buttonH / 2)
    context.lineTo(playPauseBtnFinished, H - buttonH)
    context.lineTo(playPauseBtnFinished, H - 2 * buttonH)
    context.fill()
    context.fillRect(playPauseBtnFinished + 2 * buttonW / 3, H - 2 * buttonH, buttonW / 3, buttonH)
    nextButtonFinished = playPauseBtnFinished + buttonW + spaceBetweenButtons

    // -> Volume Up
    context.beginPath()
    context.fillRect(W - botBarSidePadding - buttonW, H - 2 * buttonH + 2 * (buttonH / 5), buttonW, buttonH / 5)
    context.fillRect(W - botBarSidePadding - buttonW + 2 * (buttonW / 5), H - 2 * buttonH, buttonH / 5, buttonH)
    volumeUpButtonFinished = W - botBarSidePadding - 2 * buttonW - spaceBetweenButtons //2 pt ca se deseneaza din colt

    // -> Volume Down
    context.beginPath()
    context.fillRect(volumeUpButtonFinished, H - 2 * buttonH + 2 * (buttonH / 5), buttonW, buttonH / 5)

    //Showing Preview Frame
    if (showPreview === true) {
        context.drawImage(videoPreview, 0, 0, W, H,
            botBarSidePadding, botBarSidePadding, 300, 169)
    } else {
        context.fillStyle = "rgba(255,255,255,0)"
        context.fillRect(botBarSidePadding, botBarSidePadding, 300, 169)
    }


    //Autoplay next video
    if (video.ended) {
        nextVideo()
    }

    requestAnimationFrame(drawVideoFrame)

}

function addNewVideo() {
    const fileInput = document.querySelector("#video_upload")
    const titleInput = document.getElementById('title')
    const uploadBtn = document.getElementById('upload')
    let videosURL
    let status = document.querySelector('p')

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length === 0) {
            alert("INVALID UPLOAD")
        }
        if (fileInput.files[0].name.includes(".mp4")) {
            status.innerHTML = fileInput.files[0].name
            videosURL = URL.createObjectURL(fileInput.files[0])

        }
    })

    uploadBtn.addEventListener('click', () => {
        if (titleInput.value.toString() === "") {
            alert("You need to give your video a title")
            return
        }
        if (fileInput.files.length === 0) {
            alert("You need to upload a video ")
            return
        }
        if (status.innerHTML === "") {
            alert("You need to upload another video")
            return
        }
        let newVideo = {
            "src": videosURL,
            "title": titleInput.value
        }
        videosArchive.push(newVideo)
        localStorage.setItem("isIndexValid", "false")
        createPlaylist()
        titleInput.value = ""
        status.innerHTML = ""
    })
}

function applyFilter() {
    const videoData = context.getImageData(0, 0, W, H)
    const data = videoData.data

    if (currentFilter === 0) { //NO FILTER
        context.drawImage(video, 0, 0, W, H)
    }

    if (currentFilter === 1) { //MOBSTER
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3
            data[i] = avg
            data[i + 1] = avg
            data[i + 2] = avg
        }
        context.putImageData(videoData, 0, 0);
    }

    if (currentFilter === 2) { //SUNNY
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= 1.5
            data[i + 1] *= 1.5
            data[i + 2] *= 1.5
        }
        context.putImageData(videoData, 0, 0)
    }

    if (currentFilter === 3) { //DARKNESS
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= 0.2
            data[i + 1] *= 0.2
            data[i + 2] *= 0.2
        }
        context.putImageData(videoData, 0, 0);
    }

    if (currentFilter === 4) { //DEMENTIA
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i]
            data[i + 1] = 255 - data[i + 1]
            data[i + 2] = 255 - data[i + 2]
        }
        context.putImageData(videoData, 0, 0)
    }
}

function nextVideo() {
    index += 1
    if (index > videosArchive.length - 1) {
        index = 0
    }
    video.src = videosArchive[index]['src']
    setCurrentTitle()
    video.load()
    video.play()
    getCurrentSubtitle()
    videoPreview.src = video.src
    videoPreview.load()
    localStorage.setItem("videoTime", video.currentTime)
    localStorage.setItem("index", index)
}

function prevVideo() {
    index -= 1
    if (index < 0) {
        index = videosArchive.length - 1
    }
    video.src = videosArchive[index]['src']
    setCurrentTitle()
    video.load()
    video.play()
    getCurrentSubtitle()
    videoPreview.src = video.src
    videoPreview.load()
    localStorage.setItem("videoTime", video.currentTime)
    localStorage.setItem("index", index)
}

function setCurrentVideo() {
    video.src = videosArchive[index]['src']
    setCurrentTitle()
    video.load()
    video.play()
    getCurrentSubtitle()
    videoPreview.src = video.src
    videoPreview.load()
    if (localStorage.getItem("firstSession") === "false") {
        localStorage.setItem("videoTime", video.currentTime)
    }
    localStorage.setItem("index", index)
}

//Setting filters
function noFilter() {
    currentFilter = 0
    localStorage.setItem("filter", currentFilter)
}

function mobsterFilter() {
    currentFilter = 1
    localStorage.setItem("filter", currentFilter)
}

function sunnyFilter() {
    currentFilter = 2
    localStorage.setItem("filter", currentFilter)
}

function darknessFilter() {
    currentFilter = 3
    localStorage.setItem("filter", currentFilter)
}

function dementiaFilter() {
    currentFilter = 4
    localStorage.setItem("filter", currentFilter)
}

//Playlist options
function deleteVideo() {
    if (videosArchive.length - 1 <= 0) {
        alert('You need at least one video in your playlist!')
        return
    }
    videosArchive.splice(index, 1)
    index = 0
    setCurrentVideo()
    createPlaylist()
    localStorage.setItem("isIndexValid", "false")
}

function moveUpVideo() {
    if (index === 0) {
        alert('Already first video in playlist')
        return
    }
    let temp = videosArchive[index - 1]
    videosArchive[index - 1] = videosArchive[index]
    videosArchive[index] = temp
    index = index - 1
    setCurrentVideo()
    createPlaylist()
    localStorage.setItem("isIndexValid", "false")
}

function moveDownVideo() {
    if (index === videosArchive.length - 1) {
        alert('Already last video in playlist')
        return
    }
    let temp = videosArchive[index + 1]
    videosArchive[index + 1] = videosArchive[index]
    videosArchive[index] = temp
    index = index + 1
    setCurrentVideo()
    createPlaylist()
    localStorage.setItem("isIndexValid", "false")
}


