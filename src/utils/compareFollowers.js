export const compareFollowers = (currentFollowers, previousFollowers) => {
    const currentSet = new Set(currentFollowers);
    const previousSet = new Set(previousFollowers);

    const unfollowed = previousFollowers.filter(follower => !currentSet.has(follower));
    const newFollowers = currentFollowers.filter(follower => !previousSet.has(follower));

    return { unfollowed, newFollowers };
};