const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');

module.exports = (_page, callback) => {
    // Init var to contain axios promises
    let promises = []

    // If {_page} is an array
    // Make request to awsubs page {_page[i]}
    if(typeof _page === 'object') {
        for(let i = 0; i < _page.length; i++) {
            let url = `${process.env.AWSUBS_BASE_URL}/page/${_page[i]}`
            promises.push(axios.get(url))
        }
    } else {
        let url = `${process.env.AWSUBS_BASE_URL}/page/${_page}`
        promises.push(axios.get(url))
    }
        
    // Parse for each promise
    axios.all(promises)
        .then((responses) => {
            // Init var to contain posts
            let posts = []

            responses.forEach((response) => {
                // Parse the response html with cheerio
                const $ = cheerio.load(response.data);
                // Get the posts element
                const postsElem = $('.aztanime:not(:contains(Other))');

                // Foreach elem, parse it
                postsElem.each((i, postElem) => {
                    // Define the post schema
                    let post = {
                        title: "",
                        episode: "",
                        url: "",
                        thumnail_url: "",
                        series: "",
                        series_url: "",
                        released_at: "",
                        dllink: ""
                    }

                    // Get each elem needed for the post
                    const titleElem = $(postElem).find('h1 a')
                    const seriesElem = $(postElem).find('.kategori a')
                    const dateElem = $(postElem).find('.kategori')
                    const timeElem = $(postElem).find('.waktu')
                    const thumnailElem = $(postElem).find('.thumbnail img')

                    // Get the episode from title
                    const titleSplit = titleElem.text().toLowerCase().split(' ')
                    const episodePos = titleSplit.indexOf('episode')
                    const episodeNum = (episodePos > 0) ? titleSplit[episodePos + 1] : '1';

                    // Get the datetime of the post
                    const katText = dateElem.text().toLowerCase()
                    const startIndex = katText.indexOf('released on') + 12
                    const endIndex = katText.indexOf('\r', startIndex)
                    const dateText = katText.slice(startIndex, endIndex)
                    const timeText = timeElem.text().toLowerCase()
                    const datetime = moment(`${dateText} ${timeText}`, 'MMMM Do- YYYY h-mm a')

                    // Put in schema
                    post.title = titleElem.text()
                    post.episode = episodeNum
                    post.url = titleElem.attr('href')
                    post.thumnail_url = thumnailElem.attr('src')
                    post.series = seriesElem.text()
                    post.series_url = process.env.AWSUBS_BASE_URL + seriesElem.attr('href')
                    post.released_at = datetime.toJSON()
                    post.dllink = `${process.env.BASE_URL}/awsubs/dl/` + encodeURIComponent(post.url)

                    // Push to posts
                    posts.push(post)
                })
            })

            callback(null, posts)
        })
        .catch((err) => {
            callback(err)
        })
}