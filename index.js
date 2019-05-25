/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on(['pull_request', 'pull_request', 'pull_request_review', 'check_run.rerequested'], check)

  async function check (context) {
    const timeStart = new Date()

    const { data: reviews } = await context.github.pullRequests.listReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number
    })

    var sortedReviews = reviews.sort(function(a, b){
      return new Date(b.submitted_at) - new Date(a.submitted_at);
    })

    var filteredReviews = []
    var reviewers = []

    sortedReviews.forEach((review) => {
      if (!reviewers.includes(review.user.login)) {
        reviewers.push(review.user.login)
        filteredReviews.push(review)
      }
    })

    var approvedReviews = filteredReviews.filter(e => e.state == 'APPROVED').map(e => e.user.login)
    var rejectedReviews = filteredReviews.filter(e => e.state == 'CHANGES_REQUESTED').map(e => e.user.login)

    var checks = []

    context.payload.pull_request.assignees.forEach((assignee) => {
      if (approvedReviews.includes(assignee.login)) {
      }
      else if (rejectedReviews.includes(assignee.login)) {
        checks[assignee.login] = "CHANGES_REQUESTED"
      } else {
        checks[assignee.login] = "PENDING"
      }      
    })

    const conclusion = Object.keys(checks).length == 0 ? 'success' : 'failure'

    var title = ""

    if (context.payload.pull_request.assignees.length == 0) {
      title = "No assignees found for this pull request"
    } else if (Object.keys(checks).length == 0) {
      title = 'All assignees have approved this pull request'
    } else {
      title = 'All assignees need to approve this pull request'
    }

    return context.github.checks.create(context.repo({
      name: 'AssigneeBot',
      head_branch: context.payload.pull_request.head.ref,
      head_sha: context.payload.pull_request.head.sha,
      status: 'completed',
      started_at: timeStart,
      conclusion: conclusion,
      completed_at: new Date(),
      output: {
        title: title,
        summary: title
      }
    }))
  }
}
