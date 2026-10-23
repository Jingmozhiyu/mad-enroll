import assert from 'node:assert/strict'
import test from 'node:test'
import {
    findCourseIdentifierMatches,
    getCourseChartPath,
    getCoursePath,
    getCourseSlug,
    parseCourseIdentifier,
} from '../lib/madgrades/identifiers.ts'

const computerScience = {code: '266', abbreviation: 'COMP SCI', name: 'Computer Sciences'}
const electricalEngineering = {code: '320', abbreviation: 'E C E', name: 'Electrical and Computer Engineering'}

function course(uuid, subjects, number = 354) {
    return {uuid, subjects, number, name: 'Machine Organization and Programming'}
}

test('canonical cross-listings follow numeric subject codes regardless of upstream order', () => {
    const source = course('course-1', [electricalEngineering, computerScience])
    assert.equal(getCourseSlug(source), 'COMPSCI_ECE_354')
    assert.equal(getCourseSlug(course('course-1', [computerScience, electricalEngineering])), 'COMPSCI_ECE_354')
    assert.deepEqual(source.subjects, [electricalEngineering, computerScience])
    assert.equal(getCourseSlug(course('course-2', [computerScience], 300)), 'COMPSCI_300')
    assert.equal(getCourseChartPath(source), '/courses/COMPSCI_ECE_354?view=charts')
})

test('numeric ordering is stable for subject codes of different lengths', () => {
    assert.equal(getCourseSlug(course('course-1', [
        {code: '100', abbreviation: 'SECOND', name: 'Second'},
        {code: '20', abbreviation: 'FIRST', name: 'First'},
    ])), 'FIRST_SECOND_354')
})

test('paths encode punctuation in a single segment while preserving readable slugs', () => {
    const source = course('course-1', [{code: '250', abbreviation: 'C & E SOC', name: 'Community Sociology'}], 140)
    assert.equal(getCourseSlug(source), 'C&ESOC_140')
    assert.equal(getCoursePath(source), '/courses/C%26ESOC_140')
    assert.deepEqual(parseCourseIdentifier('C&ESOC_140'), {subjects: ['C&ESOC'], number: 140})
})

test('readable input accepts normalization but rejects malformed or duplicate subject tokens', () => {
    assert.deepEqual(parseCourseIdentifier('comp sci_e c e_354'), {
        subjects: ['COMPSCI', 'ECE'], number: 354,
    })
    for (const identifier of ['300', 'COMPSCI_', '_300', 'COMPSCI_0', 'COMPSCI_300x', 'COMPSCI__300',
        'COMPSCI_COMPSCI_300', 'C%26ESOC_140', 'COMPSCI/300', '../COMPSCI_300']) {
        assert.equal(parseCourseIdentifier(identifier), null, identifier)
    }
})

test('exact subject sets take precedence over a broader cross-listed alias', () => {
    const exact = course('exact', [computerScience])
    const crossListed = course('cross-listed', [computerScience, electricalEngineering])
    assert.deepEqual(findCourseIdentifierMatches([crossListed, exact], ['266'], 354), [exact])
    assert.deepEqual(findCourseIdentifierMatches([crossListed, exact], ['320', '266'], 354), [crossListed])
})

test('subset aliases are only resolvable when the candidate identity is unique', () => {
    const first = course('first', [computerScience, electricalEngineering])
    const second = course('second', [computerScience, {code: '600', abbreviation: 'MATH', name: 'Mathematics'}])
    assert.deepEqual(findCourseIdentifierMatches([first], ['266'], 354), [first])
    assert.equal(findCourseIdentifierMatches([first, second], ['266'], 354).length, 2)
    assert.deepEqual(findCourseIdentifierMatches([first], ['266'], 300), [])
    assert.deepEqual(findCourseIdentifierMatches([first], ['600'], 354), [])
})

test('duplicate records do not create ambiguity but distinct historical identities do', () => {
    const first = course('first', [computerScience])
    const second = course('second', [computerScience])
    assert.deepEqual(findCourseIdentifierMatches([first, first], ['266'], 354), [first])
    assert.equal(findCourseIdentifierMatches([first, second], ['266'], 354).length, 2)
})

test('missing abbreviation falls back to the source code and missing subjects preserve UUID links', () => {
    assert.equal(getCourseSlug(course('source-id', [{code: '266', name: 'Computer Sciences'}], 300)), '266_300')
    assert.equal(getCoursePath(course('source-id', [], 300)), '/courses/source-id')
})
