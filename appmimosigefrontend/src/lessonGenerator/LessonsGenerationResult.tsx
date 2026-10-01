//LessonsGenerationResult.tsx

import type { FC } from "react";
import { Alert, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { formatDate, formatDateTime } from "../studentContracts/dateFormat";
import { groupEditRoute } from "../groups/groupsMenu";
import type {
    IGroupLessonsGeneration,
    ILessonsGeneration,
} from "../redux/types/lessonGeneratorTypes";
import {
    actionCaption,
    changeDetails,
    groupSummary,
    hasChangesOrErrors,
} from "./lessonGeneration";

type GroupResultProps = {
    group: IGroupLessonsGeneration;
    //რამდენიმე ჯგუფის შედეგში ჯგუფის კოდი ბმულია
    showGroupLink: boolean;
};

const GroupResult: FC<GroupResultProps> = ({ group, showGroupLink }) => (
    <div className="mt-2">
        <div>
            {showGroupLink && (
                <>
                    <Link to={`/${groupEditRoute}/${group.grpId}`}>
                        ჯგუფი {group.groupCode}
                    </Link>
                    {": "}
                </>
            )}
            {groupSummary(group)}
        </div>
        {group.errors.length > 0 && (
            <Table size="sm" bordered className="mt-1 mb-1">
                <thead>
                    <tr>
                        <th>თარიღი</th>
                        <th>გაკვეთილი</th>
                        <th>შეცდომა</th>
                    </tr>
                </thead>
                <tbody>
                    {group.errors.map((error, index) => (
                        <tr key={index} className="table-warning">
                            <td>{formatDateTime(error.lessonDate)}</td>
                            <td>{error.lessonId ?? ""}</td>
                            <td>
                                {error.errorCode}. {error.errorText}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        )}
        {group.changes.length > 0 && (
            <details>
                <summary>ცვლილებები ({group.changes.length})</summary>
                <Table size="sm" bordered className="mt-1">
                    <thead>
                        <tr>
                            <th>გაკვეთილის დრო</th>
                            <th>ცვლილება</th>
                            <th>გაკვეთილი</th>
                            <th>დეტალები</th>
                        </tr>
                    </thead>
                    <tbody>
                        {group.changes.map((change, index) => (
                            <tr key={index}>
                                <td>
                                    {change.previousLessonDt &&
                                        `${formatDateTime(change.previousLessonDt)} → `}
                                    {formatDateTime(change.lessonDt)}
                                </td>
                                <td>{actionCaption(change.action)}</td>
                                <td>{change.lessonId ?? ""}</td>
                                <td>{changeDetails(change)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </details>
        )}
    </div>
);

type LessonsGenerationResultProps = {
    generation: ILessonsGeneration;
    onClose: () => void;
};

//გენერაციის შედეგი: შექმნილი, შეცვლილი და წაშლილი გაკვეთილები და შეცდომები ჯგუფებად
const LessonsGenerationResult: FC<LessonsGenerationResultProps> = ({
    generation,
    onClose,
}) => {
    const groupsToShow = generation.groups.filter(hasChangesOrErrors);
    const manyGroups = generation.groups.length !== 1;
    return (
        <Alert variant="info" dismissible onClose={onClose}>
            <div>
                გაკვეთილები დათვლილია {formatDate(generation.horizonEnd)}-ის
                ჩათვლით.
                {manyGroups &&
                    ` დამუშავდა ${generation.groups.length} ჯგუფი, ცვლილება ან შეცდომა აქვს ${groupsToShow.length}-ს.`}
            </div>
            {generation.addedOperationMonthsCount > 0 && (
                <div>
                    დაემატა {generation.addedOperationMonthsCount} სამუშაო
                    თვე: ყველა ჯგუფი და კონტრაქტი მოინიშნა გადასათვლელად.
                </div>
            )}
            {!manyGroups && groupsToShow.length === 0 && (
                <div>გაკვეთილები უკვე ისეთია, როგორიც უნდა იყოს.</div>
            )}
            {groupsToShow.map((group) => (
                <GroupResult
                    key={group.grpId}
                    group={group}
                    showGroupLink={manyGroups}
                />
            ))}
        </Alert>
    );
};

export default LessonsGenerationResult;
