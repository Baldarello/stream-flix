# Context

## Open Issues

Run the following to list open issues:
```
gh issue list --state open --label Sandcastle --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
```

To view a specific issue:
```
gh issue view <number> --comments
```

## Task

Work on the open issues one by one. After completing each issue, close it with:
```
gh issue close <number> --comment "Completed by Sandcastle"
```
