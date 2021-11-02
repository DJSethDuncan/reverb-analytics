const axios = require('axios')


const main = async () => {
    try {
        const url = 'https://api.reverb.com/api/listings'
        const token = process.env.TOKEN
        const opts = {
            params: {
                query: 'blackstar+ht5r',
                page: 1
            },
            headers: {
                'Accept-Version': '3.0',
                'Accept': 'application/hal+json',
                'Authorization': 'Bearer ' + token
            },
        }

        console.log('Starting request...')
        const res = await axios.get(url, opts)
        const pages = res.data.total_pages
        let listings = []
        let listingIds = []
        let listingsMetaData = {
            prices: [],
            mean: 0,
            mean: 0
        }

        for (let i = 1; i <= 2; i++) {
            console.log(`Requesting page ${i}/${pages}`)
            let iRes = await axios.get(url, opts)
            iRes.data.listings.forEach((listing) => {
                // skip dupes
                if (listingIds.indexOf(listing.id) == -1) {
                    if (listing.price.currency === 'USD') {
                        listingsMetaData.prices.push(listing.price.amount_cents)
                    }
                    listings.push(listing)
                }
            })
            opts.page++
        }

        processMetaData(listingsMetaData)

        console.log(`Loaded ${listings.length} listings...`)
        console.log(listingsMetaData)

        // const listings = res.data.listings

        // console.log(listings)

    } catch (err) {
        console.error(err)
    }

}

main()

const processMetaData = (data) => {
    const priceStats = getPriceStats(data.prices)
    data.prices = sortPrices(data.prices)
    data.high = priceStats.high
    data.low = priceStats.low
    data.mean = priceStats.mean
    data.adjusted = getAdjustedPriceStats(data.prices)
    return data
}

const getPriceStats = (arr) => {
    let runningTotal = 0
    let stats = {
        mean: 0,
        low: 0,
        high: 0
    }

    for (let i in arr) {
        if (!stats.low || arr[i] < stats.low) stats.low = arr[i]
        if (arr[i] > stats.high) stats.high = arr[i]
        runningTotal += arr[i]
    }
    stats.mean = Math.round(runningTotal / arr.length)
    return stats
}

const sortPrices = (arr) => {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < (arr.length - i - 1); j++) {
            if (arr[j] > arr[j + 1]) {
                let thisComparison = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = thisComparison
            }
        }
    }
    return arr
}

const getAdjustedPriceStats = (arr) => {
    let runningTotal = 0
    let adjustedPriceStats = {
        median: getMedian(arr),
        q1: 0,
        q3: 0,
        iqr: 0,
        mean: 0,
        iqrPrices: []
    }
    let left = [], right = [], q1 = 0, q3 = 0, iqr = 0
    if (isOdd(arr.length)) {
        // is odd
        left = arr.slice(0, (Math.trunc(arr.length / 2)))
        right = arr.slice(Math.trunc(arr.length / 2) + 1, arr.length)
    } else {
        // is even
        left = arr.slice(0, (arr.length / 2))
        right = arr.slice(arr.length / 2, arr.length)
    }
    adjustedPriceStats.q1 = getMedian(left)
    adjustedPriceStats.q3 = getMedian(right)
    adjustedPriceStats.iqr = adjustedPriceStats.q3 - adjustedPriceStats.q1
    for (let j in arr) {
        if (arr[j] > adjustedPriceStats.q1 && arr[j] < adjustedPriceStats.q3) {
            runningTotal += arr[j]
            adjustedPriceStats.iqrPrices.push(arr[j])
        }
    }
    adjustedPriceStats.mean = Math.trunc(runningTotal / adjustedPriceStats.iqrPrices.length)
    return adjustedPriceStats
}

const getMedian = (arr) => {
    let median = 0
    if (isOdd(arr.length)) {
        median = arr[Math.trunc(arr.length / 2) + 1]
    } else {
        median = (arr[Math.trunc(arr.length / 2) - 1] + arr[Math.trunc(arr.length / 2)]) / 2
    }
    return median
}

const isOdd = (num) => {
    return num % 2
}