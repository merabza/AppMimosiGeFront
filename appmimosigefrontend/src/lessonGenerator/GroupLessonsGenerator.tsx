//GroupLessonsGenerator.tsx

import { useState, type FC } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import {
    useGenerateGroupLastLessonMutation,
    useGenerateGroupLessonsMutation,
} from "../redux/api/lessonGeneratorApi";
import type {
    IGroupLastLesson,
    ILessonsGeneration,
} from "../redux/types/lessonGeneratorTypes";
import { formatDateTime } from "../studentContracts/dateFormat";
import LessonsGenerationResult from "./LessonsGenerationResult";
import { lessonGeneratorLogRoute } from "./lessonGeneration";
import {
    groupLessonsUrl,
    lessonEditUrl,
    useHasLessonsRight,
} from "../lessons/lessonsMenu";

type GroupLessonsGeneratorProps = {
    grpId: number;
    //გენერატორი შენახულ ჯგუფს იყენებს, ამიტომ შეუნახავი ცვლილებებისას ღილაკები გამორთულია
    hasUnsavedChanges: boolean;
};

interface IResult {
    generation: ILessonsGeneration;
    lastLesson?: IGroupLastLesson;
}

//Access-ის FrmGroups-ის ღილაკები "ამ ჯგუფის გაკვეთილები" და "ამ ჯგუფის ბოლო გაკვეთილი" და მათი შედეგი.
//შეცდომა ჯგუფის ფორმის AlertMessages-ში ჩანს. გაკვეთილების მენიუს უფლებით "ბოლო გაკვეთილი" Access-ივით
//პირდაპირ გაკვეთილის ჟურნალს ხსნის და ჩანს ჯგუფის გაკვეთილების სიის ბმული
const GroupLessonsGenerator: FC<GroupLessonsGeneratorProps> = ({
    grpId,
    hasUnsavedChanges,
}) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const hasLessonsRight = useHasLessonsRight();
    const [generateLessons, { isLoading: generating }] =
        useGenerateGroupLessonsMutation();
    const [generateLastLesson, { isLoading: generatingLastLesson }] =
        useGenerateGroupLastLessonMutation();
    const [result, setResult] = useState<IResult | null>(null);
    const busy = generating || generatingLastLesson;

    async function handleLessons() {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setResult(null);
        try {
            setResult({ generation: await generateLessons(grpId).unwrap() });
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში
        }
    }

    async function handleLastLesson() {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setResult(null);
        try {
            const lastLesson = await generateLastLesson(grpId).unwrap();
            if (hasLessonsRight && lastLesson.lessonId !== null)
                navigate(lessonEditUrl(lastLesson.lessonId));
            else setResult({ generation: lastLesson.generation, lastLesson });
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში
        }
    }

    return (
        <>
            <div className="mb-2 text-end">
                {hasUnsavedChanges && (
                    <small className="text-muted me-2">
                        გაკვეთილები შენახული ჯგუფით ითვლება: ჯერ შეინახეთ
                        ცვლილებები
                    </small>
                )}
                <Button
                    variant="outline-primary"
                    className="me-2"
                    disabled={busy || hasUnsavedChanges}
                    onClick={handleLessons}
                >
                    ამ ჯგუფის გაკვეთილები
                    {generating && <Spinner size="sm" animation="border" />}
                </Button>
                <Button
                    variant="outline-primary"
                    className="me-2"
                    disabled={busy || hasUnsavedChanges}
                    onClick={handleLastLesson}
                >
                    ამ ჯგუფის ბოლო გაკვეთილი
                    {generatingLastLesson && (
                        <Spinner size="sm" animation="border" />
                    )}
                </Button>
                <Link to={`/${lessonGeneratorLogRoute}?grpId=${grpId}`}>
                    გენერატორის ლოგი
                </Link>
                {hasLessonsRight && (
                    <Link className="ms-2" to={groupLessonsUrl(grpId)}>
                        გაკვეთილების ჟურნალი
                    </Link>
                )}
            </div>
            {result?.lastLesson && (
                <Alert variant="success">
                    {result.lastLesson.lessonId === null
                        ? "ჯგუფს დღემდე გაკვეთილის დღე არ ჰქონია"
                        : `ბოლო გაკვეთილი: ${formatDateTime(result.lastLesson.lessonDt)} (ID ${result.lastLesson.lessonId})`}
                </Alert>
            )}
            {result && (
                <LessonsGenerationResult
                    generation={result.generation}
                    onClose={() => setResult(null)}
                />
            )}
        </>
    );
};

export default GroupLessonsGenerator;
