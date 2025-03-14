const createSelector = require('reselect').createSelector;

module.exports = {

	contentsOfFiles: (selector) => {
		return createSelector([selector], (selected) => {
			return Object.keys(selected).reduce((mm, k) => mm + selected[k], '')
		})
	},

	contentOfFile: (selector) => {
		return createSelector([selector], (selected) => {
			try{
        return selected[Object.keys(selected)[0]]
      } catch (e) {
        console.error("error", e)
				console.error("selected", selected)
				console.error("selector", selector)
				process.exit(-1)
      }
		})
	},

	srcAndContentOfFile: (selector, key) => {
		return createSelector([selector], (selected) => {
			return {
				src: key,
				content: selected[key]
			}
		})
	},

	srcAndContentOfFiles: (selector) => {
		return createSelector([selector], (selected) => {
			const keys = Object.keys(selected)
			return keys.map((key) => {
				return {
					src: key,
					content: selected[key]
				}
			})
		})
	}
}
