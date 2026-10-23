import assert from 'node:assert/strict'
import test from 'node:test'
import {
    calculateGpa,
    combineAllDistributions,
    formatGpa,
    getEmptyDistribution,
    getGradeLabel,
    getGradePercentage,
    getLetterGradeCount,
    getNonLetterGradeCount,
    LETTER_GRADE_KEYS,
    normalizeCourseGrades,
    normalizeGradeDistribution,
} from '../lib/madgrades/utils.ts'

test('cumulative GPA and A percentage weight unequal terms by grade counts', () => {
    const smallTerm = {...getEmptyDistribution(1252), aCount: 10, total: 10}
    const largeTerm = {...getEmptyDistribution(1254), bCount: 90, total: 90}
    const combined = combineAllDistributions([smallTerm, largeTerm])

    assert.equal(getLetterGradeCount(combined), 100)
    assert.equal(calculateGpa(combined), 3.1)
    assert.equal(getGradePercentage(combined, 'aCount'), 10)
    assert.notEqual(calculateGpa(combined), (calculateGpa(smallTerm) + calculateGpa(largeTerm)) / 2)
})

test('GPA and percentages include AB and BC and exclude non-letter grades', () => {
    const distribution = {
        ...getEmptyDistribution(),
        aCount: 4,
        abCount: 2,
        bCount: 1,
        bcCount: 2,
        fCount: 1,
        sCount: 10,
        crCount: 20,
        otherCount: 5,
        total: 45,
    }

    assert.equal(getLetterGradeCount(distribution), 10)
    assert.equal(getNonLetterGradeCount(distribution), 35)
    assert.equal(calculateGpa(distribution), 3.1)
    assert.equal(getGradePercentage(distribution, 'aCount'), 40)
    assert.equal(getGradePercentage(distribution, 'abCount'), 20)
    assert.equal(getGradePercentage(distribution, 'bcCount'), 20)
    assert.equal(getGradePercentage(distribution, 'fCount'), 10)
    assert.equal(LETTER_GRADE_KEYS.reduce((sum, key) => sum + getGradePercentage(distribution, key), 0), 100)
})

test('non-letter-only and empty distributions have unavailable GPA and percentages', () => {
    const nonLetterOnly = {...getEmptyDistribution(), sCount: 12, crCount: 8, total: 20}

    for (const distribution of [getEmptyDistribution(), nonLetterOnly]) {
        assert.equal(getLetterGradeCount(distribution), 0)
        assert.ok(Number.isNaN(calculateGpa(distribution)))
        assert.equal(formatGpa(calculateGpa(distribution)), 'N/A')
        for (const key of LETTER_GRADE_KEYS) {
            assert.equal(getGradePercentage(distribution, key), null)
        }
    }

    assert.equal(getNonLetterGradeCount(nonLetterOnly), 20)
})

test('an all-F distribution is a real zero GPA, distinct from no letter grades', () => {
    const distribution = {...getEmptyDistribution(), fCount: 15, total: 15}

    assert.equal(calculateGpa(distribution), 0)
    assert.equal(formatGpa(calculateGpa(distribution)), '0.00')
    assert.equal(getGradePercentage(distribution, 'aCount'), 0)
    assert.equal(getGradePercentage(distribution, 'fCount'), 100)
})

test('Madgrades U counts are preserved in camel case and legacy aliases', () => {
    for (const field of ['uCount', 'u_count', 'ubCount', 'ub_count']) {
        const distribution = normalizeGradeDistribution({aCount: 8, [field]: 2, total: 10})
        assert.equal(getNonLetterGradeCount(distribution), 2, field)
        assert.equal(getLetterGradeCount(distribution) + getNonLetterGradeCount(distribution), distribution.total, field)
        assert.equal(calculateGpa(distribution), 4)
        assert.equal(getGradePercentage(distribution, 'aCount'), 100)
    }
    assert.equal(getGradeLabel('ubCount'), 'U')
})

test('jointly taught sections count once in course totals and remain shared for instructors', () => {
    const grades = normalizeCourseGrades({
        courseOfferings: [{
            termCode: 1254,
            sections: [{
                aCount: 6,
                bCount: 4,
                sCount: 2,
                total: 12,
                instructors: [{id: 1, name: 'Instructor One'}, {id: 2, name: 'Instructor Two'}],
            }],
        }],
    })

    assert.equal(grades.cumulative.total, 12)
    assert.equal(getLetterGradeCount(grades.cumulative), 10)
    assert.equal(getNonLetterGradeCount(grades.cumulative), 2)
    assert.equal(calculateGpa(grades.cumulative), 3.6)
    assert.equal(grades.instructors.length, 2)
    for (const instructor of grades.instructors) {
        assert.equal(instructor.cumulative.total, 12)
        assert.equal(getGradePercentage(instructor.cumulative, 'aCount'), 60)
    }
})
