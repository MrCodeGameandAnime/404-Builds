// @ts-nocheck
import { contentFingerprint, mergeIssuePair, resolveConflict } from './domain.js';
export async function reconcilePair(input) {
    const decision = resolveConflict(input);
    const merged = mergeIssuePair(input);
    const tasks = [];
    if (contentFingerprint(input.github) !== contentFingerprint(merged)) {
        tasks.push(input.updateGitHub(input.githubNumber, merged));
    }
    if (contentFingerprint(input.linear) !== contentFingerprint(merged)) {
        tasks.push(input.updateLinear(input.linearId, merged));
    }
    await Promise.all(tasks);
    return {
        ...decision,
        lastSynced: merged
    };
}
